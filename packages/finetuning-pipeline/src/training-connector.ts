import { execSync } from 'child_process'
import * as fsp from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@ideia/logger'
import type { PEFTConfig, PEFTMethod, TrainingRun, TrainingHyperparameters } from './peft-executor'

const log = createLogger('finetuning-pipeline:connector')

export interface TrainingBackend {
  name: string
  type: 'unsloth' | 'axolotl' | 'huggingface' | 'mlx'
  available: boolean
  requiresGpu: boolean
}

export class TrainingConnector {
  async detectBackends(): Promise<TrainingBackend[]> {
    const backends: TrainingBackend[] = []

    backends.push({
      name: 'HuggingFace PEFT',
      type: 'huggingface',
      available: await this.checkPythonPackage('peft'),
      requiresGpu: true,
    })

    backends.push({
      name: 'Unsloth',
      type: 'unsloth',
      available: await this.checkPythonPackage('unsloth'),
      requiresGpu: true,
    })

    backends.push({
      name: 'MLX',
      type: 'mlx',
      available: await this.checkPythonPackage('mlx'),
      requiresGpu: false,
    })

    const available = backends.filter(b => b.available)
    log.info('Training backends detected', {
      total: backends.length,
      available: available.length,
      names: available.map(b => b.name),
    })

    return backends
  }

  async runTraining(
    run: TrainingRun,
    datasetPath: string,
    outputDir: string,
  ): Promise<{
    success: boolean
    metrics: { trainLoss: number[]; evalLoss: number[]; perplexity: number }
    adapterPath?: string
    error?: string
  }> {
    const backends = await this.detectBackends()
    const preferred = this.selectBackend(backends, run.peftConfig.method)

    if (!preferred) {
      log.warn('No real training backend available')
      return { success: false, metrics: { trainLoss: [], evalLoss: [], perplexity: 0 }, error: 'No backend available' }
    }

    const adapterDir = path.join(outputDir, `adapter-${run.id}`)
    await fsp.mkdir(adapterDir, { recursive: true })

    const scriptPath = path.join(outputDir, `_train_${run.id}.py`)

    try {
      const script = this.generateScript(preferred.type, run, datasetPath, adapterDir)
      await fsp.writeFile(scriptPath, script, 'utf-8')

      log.info('Starting real training', {
        backend: preferred.name,
        model: run.baseModel,
        method: run.peftConfig.method,
      })

      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      const output = execSync(`${pythonCmd} "${scriptPath}" 2>&1`, {
        timeout: 7200000,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      })

      const metrics = this.parseTrainingOutput(output)
      const adapterExists = await fsp.stat(path.join(adapterDir, 'adapter_config.json'))
        .then(() => true).catch(() => false)

      return {
        success: adapterExists,
        metrics: metrics || { trainLoss: [], evalLoss: [], perplexity: 0 },
        adapterPath: adapterExists ? adapterDir : undefined,
      }
    } catch (err) {
      return {
        success: false,
        metrics: { trainLoss: [], evalLoss: [], perplexity: 0 },
        error: String(err),
      }
    } finally {
      await fsp.unlink(scriptPath).catch(() => {})
    }
  }

  selectBackend(backends: TrainingBackend[], method: PEFTMethod): TrainingBackend | null {
    if (method === 'qlora') {
      const unsloth = backends.find(b => b.type === 'unsloth' && b.available)
      if (unsloth) return unsloth
    }
    const hf = backends.find(b => b.type === 'huggingface' && b.available)
    if (hf) return hf
    const mlx = backends.find(b => b.type === 'mlx' && b.available)
    if (mlx) return mlx
    return null
  }

  generateScript(
    backendType: string,
    run: TrainingRun,
    datasetPath: string,
    adapterDir: string,
  ): string {
    const method = run.peftConfig.method
    const hp = run.hyperparameters
    const qConfig = run.peftConfig.quantization

    if (backendType === 'unsloth') {
      return this.generateUnslothScript(run.baseModel, datasetPath, adapterDir, method, hp, run.peftConfig.rank, run.peftConfig.alpha, run.peftConfig.dropout, qConfig)
    }
    return this.generateHuggingFaceScript(run.baseModel, datasetPath, adapterDir, method, hp, run.peftConfig, qConfig)
  }

  generateUnslothScript(
    baseModel: string,
    datasetPath: string,
    adapterDir: string,
    method: string,
    hp: TrainingHyperparameters,
    peftRank: number,
    peftAlpha: number,
    peftDropout: number,
    qConfig?: PEFTConfig['quantization'],
  ): string {
    const loadIn4bit = method === 'qlora' ? 'True' : 'False'
    return `
import sys
try:
    from unsloth import FastLanguageModel
    from datasets import load_dataset
    from transformers import TrainingArguments
    from trl import SFTTrainer
    import torch, json, os

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="${baseModel.replace(/\\/g, '/')}",
        max_seq_length=${hp.maxSeqLength},
        dtype=None,
        load_in_4bit=${loadIn4bit},
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=${peftRank},
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=${peftAlpha},
        lora_dropout=${peftDropout},
        bias="none",
        use_gradient_checkpointing="unsloth",
        use_rslora=True,
    )

    dataset = load_dataset("json", data_files="${datasetPath.replace(/\\/g, '/')}", split="train")

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=TrainingArguments(
            per_device_train_batch_size=${hp.batchSize},
            gradient_accumulation_steps=${hp.gradientAccumulationSteps},
            num_train_epochs=${hp.epochs},
            learning_rate=${hp.learningRate},
            fp16=not ${String(hp.bf16).toLowerCase()},
            bf16=${String(hp.bf16).toLowerCase()},
            warmup_ratio=${hp.warmupRatio},
            logging_steps=1,
            output_dir="${adapterDir.replace(/\\/g, '/')}",
            save_strategy="no",
            report_to="none",
        ),
        max_seq_length=${hp.maxSeqLength},
        packing=True,
    )

    trainer.train()

    model.save_pretrained("${adapterDir.replace(/\\/g, '/')}")
    tokenizer.save_pretrained("${adapterDir.replace(/\\/g, '/')}")

    log_history = trainer.state.log_history
    train_losses = [x["loss"] for x in log_history if "loss" in x]
    eval_losses = [x["eval_loss"] for x in log_history if "eval_loss" in x]

    print(f"METRICS: {json.dumps({'trainLoss': train_losses[-10:] if train_losses else [], 'evalLoss': eval_losses[-10:] if eval_losses else [], 'perplexity': 2.718 ** (eval_losses[-1] if eval_losses else 0.5)})}")
    print("OK: Training complete")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`
  }

  generateHuggingFaceScript(
    baseModel: string,
    datasetPath: string,
    adapterDir: string,
    method: string,
    hp: TrainingHyperparameters,
    peftConfig: PEFTConfig,
    qConfig?: PEFTConfig['quantization'],
  ): string {
    const quantBits = qConfig?.type === 'nf4' ? 4 : qConfig?.type === 'int8' ? 8 : 'none'
    return `
import sys
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, BitsAndBytesConfig
    from peft import LoraConfig, get_peft_model, TaskType
    from datasets import load_dataset
    import torch, json

    bnb_config = None
    ${quantBits !== 'none' ? `
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=${String(quantBits === 4).toLowerCase()},
        load_in_8bit=${String(quantBits === 8).toLowerCase()},
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=${String(qConfig?.doubleQuant ?? true).toLowerCase()},
        bnb_4bit_quant_type="nf4",
    )
` : ''}

    model = AutoModelForCausalLM.from_pretrained(
        "${baseModel.replace(/\\/g, '/')}",
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    peft_config = LoraConfig(
        r=${peftConfig.rank},
        lora_alpha=${peftConfig.alpha},
        lora_dropout=${peftConfig.dropout},
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, peft_config)

    dataset = load_dataset("json", data_files="${datasetPath.replace(/\\/g, '/')}", split="train")

    tokenizer = AutoTokenizer.from_pretrained("${baseModel.replace(/\\/g, '/')}")
    tokenizer.pad_token = tokenizer.eos_token

    def format_func(examples):
        texts = [f"### Input: {i}\\n### Output: {o}" for i, o in zip(examples["input"], examples["output"])]
        return tokenizer(texts, truncation=True, max_length=${hp.maxSeqLength}, padding=False)

    dataset = dataset.map(format_func, batched=True, remove_columns=dataset.column_names)

    training_args = TrainingArguments(
        per_device_train_batch_size=${hp.batchSize},
        gradient_accumulation_steps=${hp.gradientAccumulationSteps},
        num_train_epochs=${hp.epochs},
        learning_rate=${hp.learningRate},
        fp16=True,
        warmup_ratio=${hp.warmupRatio},
        logging_steps=1,
        output_dir="${adapterDir.replace(/\\/g, '/')}",
        save_strategy="no",
        report_to="none",
    )

    from transformers import Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        tokenizer=tokenizer,
    )

    trainer.train()

    model.save_pretrained("${adapterDir.replace(/\\/g, '/')}")
    tokenizer.save_pretrained("${adapterDir.replace(/\\/g, '/')}")

    log_history = trainer.state.log_history
    train_losses = [x["loss"] for x in log_history if "loss" in x]
    print(f"METRICS: {json.dumps({'trainLoss': train_losses[-10:], 'evalLoss': [], 'perplexity': 2.718 ** (train_losses[-1] if train_losses else 0.5)})}")
    print("OK: Training complete")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`
  }

  async mergeAdapter(baseModel: string, adapterPath: string, outputPath: string): Promise<boolean> {
    const scriptPath = path.join(outputPath, '_merge.py')
    await fsp.mkdir(outputPath, { recursive: true })

    const script = `
import sys
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    import torch

    base = AutoModelForCausalLM.from_pretrained(
        "${baseModel.replace(/\\/g, '/')}",
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    model = PeftModel.from_pretrained(base, "${adapterPath.replace(/\\/g, '/')}")
    merged = model.merge_and_unload()

    merged.save_pretrained("${outputPath.replace(/\\/g, '/')}")
    tokenizer = AutoTokenizer.from_pretrained("${baseModel.replace(/\\/g, '/')}")
    tokenizer.save_pretrained("${outputPath.replace(/\\/g, '/')}")
    print("OK: Model merged and saved")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`
    await fsp.writeFile(scriptPath, script, 'utf-8')

    try {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      execSync(`${pythonCmd} "${scriptPath}" 2>&1`, {
        timeout: 3600000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      })
      return true
    } catch {
      return false
    } finally {
      await fsp.unlink(scriptPath).catch(() => {})
    }
  }

  async evaluateModel(modelPath: string, testDatasetPath: string): Promise<{ perplexity: number; loss: number }> {
    const scriptPath = path.join(path.dirname(testDatasetPath), '_eval.py')
    const script = `
import sys
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from datasets import load_dataset
    import torch, math

    model = AutoModelForCausalLM.from_pretrained("${modelPath.replace(/\\/g, '/')}", device_map="auto")
    tokenizer = AutoTokenizer.from_pretrained("${modelPath.replace(/\\/g, '/')}")
    dataset = load_dataset("json", data_files="${testDatasetPath.replace(/\\/g, '/')}", split="train")

    total_loss = 0
    count = 0
    for example in dataset:
        inputs = tokenizer(example["text"], return_tensors="pt", truncation=True, max_length=2048)
        with torch.no_grad():
            outputs = model(**inputs.to(model.device), labels=inputs["input_ids"].to(model.device))
            total_loss += outputs.loss.item()
            count += 1

    avg_loss = total_loss / max(1, count)
    print(f"EVAL: loss={avg_loss:.4f} perplexity={math.exp(avg_loss):.2f}")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`
    await fsp.writeFile(scriptPath, script, 'utf-8')

    try {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      const output = execSync(`${pythonCmd} "${scriptPath}" 2>&1`, {
        timeout: 600000,
        encoding: 'utf-8',
      })
      const match = output.match(/EVAL: loss=([\d.]+) perplexity=([\d.]+)/)
      if (match) {
        const loss = match[1] ?? '0'
        const perplexity = match[2] ?? '0'
        return { loss: parseFloat(loss), perplexity: parseFloat(perplexity) }
      }
    } catch { /* evaluation failed */ }
    finally {
      await fsp.unlink(scriptPath).catch(() => {})
    }

    return { perplexity: 0, loss: 0 }
  }

  async checkPythonPackage(pkg: string): Promise<boolean> {
    try {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      execSync(`"${pythonCmd}" -c "import ${pkg}" 2>&1`, { timeout: 5000, encoding: 'utf-8' })
      return true
    } catch {
      return false
    }
  }

  parseTrainingOutput(output: string): { trainLoss: number[]; evalLoss: number[]; perplexity: number } | null {
    const metricsMatch = output.match(/METRICS:\s*(\{.+?\})/)
    if (metricsMatch) {
      try {
        return JSON.parse(metricsMatch[1]) as { trainLoss: number[]; evalLoss: number[]; perplexity: number }
      } catch { /* parse error */ }
    }
    return null
  }
}
