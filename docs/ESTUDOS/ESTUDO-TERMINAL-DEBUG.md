# Estudo: Terminal, LSP, DAP e Integração de Debugging para IDEIA

> **Data:** 2026-07-18
> **Contexto:** IDEIA — evolução do ai-devkit para IDE completa com terminar integrado, LSP e debugger
> **Objetivo:** Pesquisa abrangente sobre integração de terminal (xterm.js + node-pty), Language Server Protocol, Debug Adapter Protocol e integração com agentes IDEIA
> **Base:** xterm.js 5.x, node-pty 1.x, LSP 3.18, DAP 1.59.x, VS Code debug adapter implementations

---

## Sumário

1. [Terminal Frontend (xterm.js)](#1-terminal-frontend-xtermjs)
2. [Terminal Backend (node-pty)](#2-terminal-backend-node-pty)
3. [LSP (Language Server Protocol)](#3-lsp-language-server-protocol)
4. [DAP (Debug Adapter Protocol)](#4-dap-debug-adapter-protocol)
5. [Task Runner](#5-task-runner)
6. [Integração com Agentes IDEIA](#6-integração-com-agentes-ideia)

---

## 1. Terminal Frontend (xterm.js)

### 1.1 xterm.js Core

xterm.js é o terminal frontend mais utilizado em IDEs web. É a base do terminal do VS Code, Theia, e será a base do terminal IDEIA.

**Arquitetura:**

```
┌────────────────────────────────────────────────────────┐
│                    xterm.js Terminal                      │
├────────────────────────────────────────────────────────┤
│                                                          │
│  Screen Buffer (Row[] → Cell[])                          │
│  ├── Buffer.active: buffer atual (viewport)              │
│  ├── Buffer.alternate: buffer alternativo (full-screen)  │
│  └── Cell: { char, width, flags, fg, bg }               │
│                                                          │
│  Parser (VT100/ANSI)                                     │
│  ├── EscapeSequenceParser: CSI, DCS, OSC, SOS, PM, APC  │
│  ├── InputHandler: processa sequências de entrada        │
│  └── OutputHandler: processa sequências de saída         │
│                                                          │
│  Renderer                                                │
│  ├── CanvasRenderer (default): renderização via <canvas> │
│  ├── DomRenderer (fallback): renderização via <div>      │
│  └── WebGLRenderer (experimental): aceleração GPU        │
│                                                          │
│  Input/Output                                            │
│  ├── Terminal.write(data): escreve no terminal            │
│  ├── Terminal.onData(cb): captura teclado               │
│  └── Terminal.onResize(cb): captura redimensionamento    │
│                                                          │
└────────────────────────────────────────────────────────┘
```

### 1.2 Addons

**Addons core (incluídos por padrão no IDEIA):**

| Addon | Função | Configuração |
|-------|--------|-------------|
| `addon-fit` | Auto-resize ao container pai | `fit.fit()` no resize |
| `addon-web-links` | Destaca URLs clicáveis | `webLinksProvider(handler)` |
| `addon-search` | Busca texto no terminal | `findNext(text, options)` |
| `addon-serialize` | Serializa buffer para HTML/texto | `serializeAsHTML()`, `serializeAsText()` |
| `addon-unicode` | Suporte Unicode (emoji, CJK) | `active: true` |
| `addon-image` | Renderização de imagens no terminal (Sixel) | `sixel: true` |
| `addon-clipboard` | Suporte a clipboard avançado | `registerClipboard()` |

**Exemplo de configuração com addons:**

```typescript
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeAddon } from '@xterm/addon-unicode';
import { ImageAddon } from '@xterm/addon-image';

const term = new Terminal({
  cols: 80,
  rows: 24,
  cursorBlink: true,
  cursorStyle: 'bar',
  fontSize: 14,
  fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
  letterSpacing: 0,
  lineHeight: 1.2,
  theme: {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    cursorAccent: '#1e1e2e',
    selectionBackground: '#585b70',
    black: '#45475a',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#f5c2e7',
    cyan: '#94e2d5',
    white: '#bac2de',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#f5c2e7',
    brightCyan: '#94e2d5',
    brightWhite: '#a6adc8',
  },
});

// Addons
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

const webLinksAddon = new WebLinksAddon((e, url) => {
  // URL click handler — abre no navegador ou no workspace
  if (url.startsWith('file://')) {
    workspace.openFile(url.replace('file://', ''));
  } else {
    shell.openExternal(url);
  }
});
term.loadAddon(webLinksAddon);

const searchAddon = new SearchAddon();
term.loadAddon(searchAddon);

const serializeAddon = new SerializeAddon();
term.loadAddon(serializeAddon);

const unicodeAddon = new UnicodeAddon();
term.loadAddon(unicodeAddon);
unicodeAddon.activate(term);

// Render to DOM
term.open(document.getElementById('terminal-container'));

// Auto-fit
window.addEventListener('resize', () => {
  fitAddon.fit();
});
```

### 1.3 Personalização: Themes, Font, Cursor

**Temas pré-definidos para IDEIA:**

```typescript
const IDEIA_THEMES = {
  'ideia-dark': {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    cursorAccent: '#1e1e2e',
    selectionBackground: '#585b70',
    // Cores ANSI 16 (Catppuccin Mocha)
    black: '#45475a', red: '#f38ba8', green: '#a6e3a1',
    yellow: '#f9e2af', blue: '#89b4fa', magenta: '#f5c2e7',
    cyan: '#94e2d5', white: '#bac2de',
  },
  'ideia-light': {
    background: '#eff1f5',
    foreground: '#4c4f69',
    cursor: '#dc8a78',
    cursorAccent: '#eff1f5',
    selectionBackground: '#acb0be',
    // Cores ANSI 16 (Catppuccin Latte)
    black: '#5c5f77', red: '#d20f39', green: '#40a02b',
    yellow: '#df8e1d', blue: '#1e66f5', magenta: '#ea76cb',
    cyan: '#179299', white: '#acb0be',
  },
  'ideia-hacker': {
    background: '#000000',
    foreground: '#00ff00',
    cursor: '#00ff00',
    cursorAccent: '#000000',
    selectionBackground: '#003300',
    black: '#000000', red: '#ff0000', green: '#00ff00',
    yellow: '#ffff00', blue: '#0000ff', magenta: '#ff00ff',
    cyan: '#00ffff', white: '#ffffff',
  },
};
```

**Opções de cursor:**

| Estilo | Aparência | Uso típico |
|--------|-----------|------------|
| `'block'` | █ Bloco sólido | Inserção |
| `'underline'` | ‗ Sublinhado | Substituição |
| `'bar'` | ▌ Barra vertical | Padrão moderno |
| `'outline'` | ▯ Bloco outline | Acessibilidade |

### 1.4 Performance

**Opções de renderer:**

```typescript
// Canvas Renderer (default — mais rápido)
const term = new Terminal({
  rendererType: 'canvas',
  allowProposedApi: true,
});

// DOM Renderer (fallback — acessível)
const term = new Terminal({
  rendererType: 'dom',
});

// WebGL Renderer (experimental — GPU)
const term = new Terminal({
  rendererType: 'webgl',
});
```

**Benchmark comparativo (viewport 80x24, 1000 linhas):**

| Renderer | FPS (idle) | FPS (burst output) | Memória | CPU | Suporte |
|----------|-----------|-------------------|---------|-----|---------|
| Canvas | 60 | 45-55 | ~15MB | Baixo | ✅ Todos navegadores |
| DOM | 60 | 30-40 | ~25MB | Médio | ✅ Acessível |
| WebGL | 60 | 55-60 | ~10MB | Muito baixo | ⚠️ Chrome/Edge |

**Configurações de buffer e performance:**

```typescript
const term = new Terminal({
  // Buffer management
  cols: 80,
  rows: 24,
  scrollback: 5000,          // Linhas no buffer de scrollback
  rowsToScroll: 5,           // Linhas por scroll com roda
  scrollOnUserInput: true,   // Auto-scroll no input

  // Smooth scrolling (macOS)
  smoothScrollDuration: 100, // ms

  // Performance
  fastScrollModifier: 'alt',  // Modifier para scroll rápido
  fastScrollSensitivity: 5,   // Velocidade de scroll rápido

  // Output throttling
  disableStdin: false,
  windowsMode: false,         // Otimizado para Windows (conpty)
});
```

**Throttling de output para bursts:**

Estratégias para evitar que o terminal trave com output massivo:

```typescript
// Estratégia 1: Buffer write com microtasks
class TerminalWriter {
  private buffer: string[] = [];
  private writing = false;
  private readonly MAX_CHUNK = 1000; // chars por write

  constructor(private term: Terminal) {}

  write(data: string): void {
    this.buffer.push(data);
    if (!this.writing) {
      this.writing = true;
      this.scheduleWrite();
    }
  }

  private scheduleWrite(): void {
    setTimeout(() => {
      const chunk = this.buffer.splice(0, this.MAX_CHUNK).join('');
      if (chunk) {
        this.term.write(chunk, () => {
          if (this.buffer.length > 0) {
            this.scheduleWrite();
          } else {
            this.writing = false;
          }
        });
      } else {
        this.writing = false;
      }
    }, 16); // ~60fps
  }
}

// Estratégia 2: Canvas renderer batch
term.parser.registerCsiHandler({ final: 'J' }, () => {
  // Força renderização em batch
  requestAnimationFrame(() => term.render());
  return false; // Não propaga
});
```

---

## 2. Terminal Backend (node-pty)

### 2.1 node-pty: Pseudoterminal para Shells Nativas

node-pty é a biblioteca que cria pseudoterminais (PTY) nativos para comunicação com shells do sistema operacional.

**Arquitetura node-pty:**

```
┌────────────────────────────────────────────────────────────────┐
│                     NODE-PTY ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Node.js Process                                                  │
│  └── node-pty library                                             │
│        ├── spawn(file, args, options) → IPty                     │
│        │     ├── Windows: ConPTY API (winpty fallback)           │
│        │     └── Unix: forkpty() (pty fork)                      │
│        │                                                           │
│        ├── IPty methods:                                          │
│        │     ├── write(data): escreve no PTY (stdin do shell)    │
│        │     ├── resize(cols, rows): redimensiona PTY            │
│        │     ├── kill(signal): encerra processo                  │
│        │     ├── onData(cb): output do shell                     │
│        │     ├── onExit(cb): processo encerrou                   │
│        │     └── pause()/resume(): controle de fluxo              │
│        │                                                           │
│        └── Process lifecycle:                                     │
│              spawn → running → [resize] → exit → cleanup          │
│                                                                   │
└────────────────────────────────────────────────────────────────┘
```

**Implementação básica:**

```typescript
import { spawn, IPty } from 'node-pty';

export class TerminalProcess {
  private pty: IPty;
  private outputBuffer: string[] = [];
  private onDataCallback: ((data: string) => void) | null = null;

  constructor(options: {
    shell?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
  }) {
    const shell = options.shell ?? this.getDefaultShell();

    this.pty = spawn(shell, options.args ?? [], {
      name: 'xterm-256color',
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
      cwd: options.cwd ?? process.cwd(),
      env: {
        ...process.env as Record<string, string>,
        TERM: 'xterm-256color',
        TERM_PROGRAM: 'IDEIA',
        TERM_PROGRAM_VERSION: '1.0.0',
        ...options.env,
      },
    });

    this.pty.onData((data: string) => {
      this.outputBuffer.push(data);
      this.onDataCallback?.(data);
    });
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

  kill(): void {
    this.pty.kill();
  }

  onData(callback: (data: string) => void): void {
    this.onDataCallback = callback;
  }

  onExit(callback: (exitCode: number, signal?: number) => void): void {
    this.pty.onExit(({ exitCode, signal }) => {
      callback(exitCode, signal);
    });
  }
}
```

### 2.2 Shell Detection

Detecção automática do shell disponível no sistema:

```typescript
interface ShellInfo {
  name: string;             // "PowerShell", "CMD", "bash", "zsh", "fish"
  path: string;             // Caminho executável
  args: string[];           // Argumentos de inicialização
  profile: string;          // Arquivo de profile
  integration: 'conpty' | 'pty' | 'winpty';
  capabilities: {
    promptMarks: boolean;   // Suporte a prompt marks
    cwdReporting: boolean;  // OSC 7 (current working dir)
    shellIntegration: boolean; // Shell integration API
  };
}

function detectShell(): ShellInfo {
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows: PowerShell Core > PowerShell 5 > CMD
    const pwshPath = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    const pwshExists = fs.existsSync(pwshPath);

    if (pwshExists) {
      return {
        name: 'PowerShell Core',
        path: pwshPath,
        args: ['-NoLogo'],
        profile: '$PROFILE',
        integration: 'conpty',
        capabilities: {
          promptMarks: true,
          cwdReporting: true,
          shellIntegration: true,
        },
      };
    }

    const ps5Path = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    if (fs.existsSync(ps5Path)) {
      return {
        name: 'PowerShell 5',
        path: ps5Path,
        args: ['-NoLogo'],
        profile: '$PROFILE',
        integration: 'conpty',
        capabilities: {
          promptMarks: false,
          cwdReporting: false,
          shellIntegration: false,
        },
      };
    }

    return {
      name: 'CMD',
      path: process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe',
      args: [],
      profile: '',
      integration: 'winpty',
      capabilities: {
        promptMarks: false,
        cwdReporting: false,
        shellIntegration: false,
      },
    };
  }

  // Unix: zsh > bash > fish
  const shells = [
    { name: 'zsh', path: '/bin/zsh', args: ['--login'] },
    { name: 'bash', path: '/bin/bash', args: ['--login'] },
    { name: 'fish', path: '/usr/local/bin/fish', args: ['--login'] },
    { name: 'sh', path: '/bin/sh', args: [] },
  ];

  for (const shell of shells) {
    if (fs.existsSync(shell.path)) {
      return {
        ...shell,
        profile: shell.name === 'zsh' ? '~/.zshrc' : '~/.bashrc',
        integration: 'pty',
        capabilities: {
          promptMarks: true,
          cwdReporting: true,
          shellIntegration: true,
        },
      };
    }
  }

  return {
    name: 'sh',
    path: '/bin/sh',
    args: [],
    profile: '',
    integration: 'pty',
    capabilities: {
      promptMarks: false,
      cwdReporting: false,
      shellIntegration: false,
    },
  };
}
```

### 2.3 Shell Integration: Prompt Marks, CWD

Shell integration permite que o terminal se comunique com o shell via sequências OSC (Operating System Commands).

```
OSC 7 (CWD Reporting):
  Esc ] 7 ; "file://hostname/path/to/cwd" Esc \
  
  → Terminal recebe e atualiza o diretório atual

FTCS Marks (Prompt Marks — Final Term):
  Esc ] 133 ; A Esc \   → Start of Prompt
  Esc ] 133 ; B Esc \   → End of Prompt
  Esc ] 133 ; C Esc \   → Start of Command Output
  Esc ] 133 ; D Esc \   → End of Command Output

  → Terminal pode:
    ├── Navegar entre comandos (Ctrl+Up/Down)
    ├── Selecionar output de comando único
    ├── Esconder prompt em seleção
    └── Identificar comandos para agentes
```

**Configuração de shell integration:**

```powershell
# PowerShell profile ($PROFILE)
function Set-IDEIAIntegration {
    $esc = [char]27
    $os = [char]9

    # Prompt marks
    $script:oldPrompt = Get-Item Function:prompt
    function global:prompt {
        "$esc]133;A$([char]7)" +       # Start prompt
        $script:oldPrompt.Invoke() +
        "$esc]133;B$([char]7)"         # End prompt
    }

    # CWD reporting
    $script:oldLocation = $ExecutionContext.SessionState.InvokeCommand.
        PreCommandLookupAction
    $ExecutionContext.SessionState.InvokeCommand.
        PreCommandLookupAction = {
        param($commandName, $commandLookupEventArgs)
        if ($commandName -eq 'cd' -or $commandName -eq 'Set-Location') {
            Set-PromptCwd
        }
    }

    function Set-PromptCwd {
        $cwd = (Get-Location).Path
        $uri = "file://$env:COMPUTERNAME$cwd"
        Write-Host -NoNewline "$esc]7;$uri$([char]7)"
    }

    Set-PromptCwd
}
Set-IDEIAIntegration
```

```bash
# Bash profile (~/.bashrc)
__ideia_prompt_start() {
    printf "\e]133;A\007"
}
__ideia_prompt_end() {
    printf "\e]133;B\007"
}
__ideia_command_start() {
    printf "\e]133;C\007"
}
__ideia_command_end() {
    printf "\e]133;D\007"
}
__ideia_update_cwd() {
    printf "\e]7;file://%s%s\007" "$HOSTNAME" "$PWD"
}

# Hook functions
PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND;}"
PROMPT_COMMAND+="__ideia_command_end; __ideia_update_cwd"

trap '__ideia_command_start' DEBUG
PS1='$(__ideia_prompt_start)'"$PS1"'$(__ideia_prompt_end)'
```

### 2.4 Environment

**Variáveis de ambiente padrão para terminais IDEIA:**

```typescript
const DEFAULT_ENV: Record<string, string> = {
  TERM: 'xterm-256color',
  TERM_PROGRAM: 'IDEIA',
  TERM_PROGRAM_VERSION: '1.0.0',
  COLORTERM: 'truecolor',
  LANG: process.env.LANG || 'en_US.UTF-8',
  LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
  EDITOR: 'code' || process.env.EDITOR,
  VISUAL: 'code' || process.env.VISUAL,
  PAGER: 'less',
  // Git
  GIT_PAGER: 'cat',           // Evita pager interativo
  // Node.js
  NODE_OPTIONS: '--max-old-space-size=4096',
  // npm
  npm_config_fund: 'false',
  npm_config_audit: 'false',
  // Deno
  DENO_NO_UPDATE_CHECK: '1',
  // Rust
  CARGO_TERM_COLOR: 'always',
};
```

### 2.5 ConPTY (Windows Pseudo Console API)

ConPTY é a API nativa da Microsoft para pseudoterminais no Windows, introduzida no Windows 10 1809. Substitui o winpty (hack baseado em pipes nomeados).

```
┌─────────────────────────────────────────────────────────────────┐
│                   WINDOWS CONPTY ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Terminal App (IDEIA)                                             │
│       │  CreatePseudoConsole(handleIn, handleOut, config)        │
│       ▼                                                           │
│  ConPTY (kernel32.dll)                                            │
│       │                                                           │
│       ├── PseudoConsole signal (resize, close)                    │
│       │                                                           │
│       │  ┌──────────────────────────────────────────────────┐    │
│       │  │  Console Driver (condrv.sys)                       │    │
│       │  │  ├── Input buffer → PTY input pipe                │    │
│       │  │  └── Output buffer ← PTY output pipe              │    │
│       │  └──────────────────────────────────────────────────┘    │
│       │                                                           │
│       └── Console Host (conhost.exe)                              │
│             └── Shell (cmd.exe / powershell.exe)                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**node-pty com ConPTY:**

```typescript
// ConPTY é usado automaticamente no Windows 10+ quando disponível
// node-pty detecta e usa: CreatePseudoConsole → conpty

const pty = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  useConpty: true,         // Força ConPTY (default: auto)
  conptyInheritCursor: false,
});

// Diferenças winpty vs conpty:
// winpty: mais lento, buffer limitado, problemas com resize
// conpty: nativo, suporte completo a VT, resize adequado
```

---

## 3. LSP (Language Server Protocol)

### 3.1 LSP Spec 3.18 (Última)

O LSP (Language Server Protocol) é um protocolo padrão para comunicação entre editores/IDEs e servidores de linguagem. A versão 3.18 (2024) inclui:

**Mensagens principais (LSP 3.18):**

```
LSP: Editor ↔ Language Server

Initialize:
  Editor → initialize { processId, capabilities, workspaceFolders }
  Editor ← initialized (notificação)

Text Document Sync:
  Editor → textDocument/didOpen { textDocument }
  Editor → textDocument/didChange { contentChanges }
  Editor → textDocument/didSave { textDocument }
  Editor → textDocument/didClose { textDocument }

Language Features:
  Editor → textDocument/completion        ← Server → CompletionList
  Editor → textDocument/hover             ← Server → Hover
  Editor → textDocument/definition        ← Server → Location[]
  Editor → textDocument/references        ← Server → Location[]
  Editor → textDocument/formatting        ← Server → TextEdit[]
  Editor → textDocument/codeAction        ← Server → Command[]
  Editor → textDocument/rename            ← Server → WorkspaceEdit
  Editor → textDocument/semanticTokens    ← Server → SemanticTokens
  Editor → textDocument/inlayHint         ← Server → InlayHint[]

Diagnostics:
  Server → textDocument/publishDiagnostics { diagnostics }

Workspace:
  Editor → workspace/symbol               ← Server → SymbolInformation[]
  Editor → workspace/executeCommand       ← Server → applyEdit
```

**LSP 3.18 features novas:**

| Feature | Descrição | Relevância IDEIA |
|---------|-----------|-----------------|
| Inlay hints | Dicas inline (tipos implícitos, nomes de parâmetros) | ✅ Visualização |
| Inline completions | Completions que substituem linha inteira | ✅ Assistente de código |
| Type hierarchy | Hierarquia de tipos (extends, implements) | ✅ Navegação |
| Linked editing | Editar múltiplos locais simultaneamente | ✅ Refatoração |
| Diagnostic pull | Servidor empurra diagnósticos ativamente | ✅ Feedback em tempo real |
| Token modifiers | Modificadores semânticos (static, abstract) | ✅ Syntax Highlight |
| Notebook support | Suporte a notebooks (Jupyter) | 📋 Futuro |

### 3.2 LSP Client Implementation no Monaco/Theia

**Implementação no IDEIA (baseada no Monaco + LSP):**

```typescript
@injectable()
export class IDEIASLSPClient implements LanguageClientFactory {
  @inject(ILogger)
  private logger: ILogger;

  @inject(WorkspaceService)
  private workspace: WorkspaceService;

  private clients: Map<string, LanguageClient> = new Map();

  async startServer(language: string, options: LanguageServerOptions): Promise<void> {
    if (this.clients.has(language)) {
      return; // Já iniciado
    }

    const serverProcess = spawn(options.command, options.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const client = new LanguageClient(
      `${language}-lsp`,
      options.name,
      {
        run: {
          module: options.modulePath,
          transport: TransportKind.ipc,
        },
      },
      {
        documentSelector: [{ language, scheme: 'file' }],
        synchronize: {
          fileEvents: [
            this.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}'),
          ],
        },
        capabilities: {
          textDocument: {
            completion: { completionItem: { snippetSupport: true } },
            hover: { contentFormat: ['markdown'] },
            signatureHelp: {},
            declaration: { linkSupport: true },
            definition: { linkSupport: true },
            typeDefinition: { linkSupport: true },
            implementation: { linkSupport: true },
            references: {},
            documentHighlight: {},
            documentSymbol: {},
            codeAction: {
              codeActionLiteralSupport: {
                codeActionKind: { valueSet: ['quickfix', 'refactor', 'source'] },
              },
            },
            codeLens: {},
            formatting: {},
            rangeFormatting: {},
            rename: { prepareSupport: true },
            publishDiagnostics: {},
            semanticTokens: {
              legend: { tokenTypes: [], tokenModifiers: [] },
              range: true,
              full: { delta: true },
            },
            inlayHint: {
              resolveSupport: { properties: ['tooltip', 'label'] },
            },
          },
          workspace: {
            symbol: {},
            didChangeConfiguration: {},
            didChangeWatchedFiles: { dynamicRegistration: true },
            executeCommand: {},
            workspaceFolders: true,
            inlineValue: {},
            typeHierarchy: {},
          },
        },
        initializationOptions: {
          preferences: {
            includeInlayParameterNameHints: 'all',
            includeInlayParameterNameHintsWhenArgumentMatchesName: true,
            includeInlayFunctionParameterTypeHints: true,
            includeInlayVariableTypeHints: true,
            includeInlayPropertyDeclarationTypeHints: true,
            includeInlayFunctionLikeReturnTypeHints: true,
          },
        },
      }
    );

    client.onNotification('window/logMessage', (msg) => {
      this.logger.log(msg.type, msg.message);
    });

    client.onNotification('textDocument/publishDiagnostics', (params) => {
      this.diagnosticManager.setMarkers(language, params.uri, params.diagnostics);
    });

    await client.start();
    this.clients.set(language, client);
  }
}
```

### 3.3 LSP Servers Comuns

**Servidores LSP pré-configurados no IDEIA:**

| Linguagem | LSP Server | Comando | Features |
|-----------|-----------|---------|----------|
| TypeScript | TypeScript (tsserver) | `tsserver` | Completo (completion, goto def, refactor, rename) |
| JavaScript | TypeScript (tsserver) | `tsserver` | Mesmo que TS |
| Python | Pyright / Pylance | `pyright-langserver` | Completo + type checking |
| Rust | rust-analyzer | `rust-analyzer` | Completo + inlay hints + type hierarchy |
| Go | gopls | `gopls` | Completo |
| Java | eclipse-jdtls | `jdtls` | Completo (lento em projetos grandes) |
| C/C++ | clangd | `clangd` | Completo (compile_commands.json) |
| PHP | intelephense | `intelephense` | Completo |
| Ruby | solargraph | `solargraph` | Completo |
| Lua | lua-language-server | `lua-ls` | Completo |
| JSON | vscode-json-languageserver | `json-languageserver` | Schema validation |
| YAML | yaml-language-server | `yaml-language-server` | Schema validation |
| CSS | vscode-css-languageserver | `css-languageserver` | Completo |
| HTML | vscode-html-languageserver | `html-languageserver` | Completo |
| Markdown | marksman | `marksman` | Links, references, completions |
| SQL | sql-language-server | `sql-language-server` | Completions, lint |
| Docker | docker-langserver | `docker-langserver` | Completions, lint |
| TOML | taplo | `taplo` | Validation, completions |
| Bash | bash-language-server | `bash-language-server` | Completions, lint |

**Gerenciamento automático de servidores LSP:**

```typescript
class LSPManager {
  private servers: Map<string, LSPServerRegistration> = new Map();
  private fileToLanguages: Map<string, string[]> = new Map();

  async onFileOpen(uri: string): Promise<void> {
    const extension = path.extname(uri);
    const languages = this.extToLanguage(extension);

    for (const lang of languages) {
      if (!this.servers.has(lang)) {
        await this.startServer(lang);
      }
      this.fileToLanguages.set(uri, [
        ...(this.fileToLanguages.get(uri) ?? []),
        lang,
      ]);
    }
  }

  async startServer(language: string): Promise<void> {
    const config = LSP_SERVER_CONFIGS[language];
    if (!config) {
      this.logger.warn(`No LSP server configured for ${language}`);
      return;
    }

    // Verifica se o servidor está instalado
    const installed = await this.checkInstalled(config.command);
    if (!installed) {
      this.logger.warn(
        `LSP server ${config.command} not installed. ` +
        `Install with: ${config.installCommand}`
      );
      return;
    }

    // Inicia servidor
    const server = await this.clientFactory.startServer(language, config);
    this.servers.set(language, { server, config });
  }

  private extToLanguage(ext: string): string[] {
    const map: Record<string, string[]> = {
      '.ts': ['typescript', 'javascript'],
      '.tsx': ['typescriptreact', 'typescript', 'javascript'],
      '.js': ['javascript'],
      '.jsx': ['javascriptreact', 'javascript'],
      '.py': ['python'],
      '.rs': ['rust'],
      '.go': ['go'],
      '.java': ['java'],
      '.c': ['c'],
      '.cpp': ['cpp'],
      '.h': ['c', 'cpp'],
      '.hpp': ['cpp'],
      '.json': ['json'],
      '.yaml': ['yaml'],
      '.yml': ['yaml'],
      '.css': ['css'],
      '.html': ['html'],
      '.md': ['markdown'],
      '.sql': ['sql'],
      '.sh': ['bash'],
      '.bash': ['bash'],
      '.lua': ['lua'],
      '.rb': ['ruby'],
      '.php': ['php'],
      '.toml': ['toml'],
      '.dockerfile': ['dockerfile'],
    };
    return map[ext] ?? [];
  }
}
```

### 3.4 LSP Features Essenciais

#### Completion

```typescript
// LSP Completion → Monaco Completion
class LSPCompletionAdapter implements CompletionItemProvider {
  async provideCompletionItems(
    model: ITextModel,
    position: Position,
    context: CompletionContext,
    token: CancellationToken,
  ): Promise<CompletionList> {
    const lspClient = LSPManager.getClient(model.getLanguageId());
    if (!lspClient) return { suggestions: [] };

    const items = await lspClient.sendRequest('textDocument/completion', {
      textDocument: { uri: model.uri.toString() },
      position: { line: position.lineNumber - 1, character: position.column - 1 },
      context: {
        triggerKind: context.triggerKind === CompletionTriggerKind.TriggerCharacter
          ? CompletionTriggerKind.TriggerCharacter
          : CompletionTriggerKind.Invoked,
        triggerCharacter: context.triggerCharacter,
      },
    });

    return {
      suggestions: items.items?.map(item => ({
        label: item.label,
        kind: this.convertKind(item.kind),
        detail: item.detail,
        documentation: item.documentation,
        insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
        range: item.textEdit?.range
          ? new Range(
              item.textEdit.range.start.line + 1,
              item.textEdit.range.start.character + 1,
              item.textEdit.range.end.line + 1,
              item.textEdit.range.end.character + 1,
            )
          : undefined,
        commitCharacters: item.commitCharacters,
        additionalTextEdits: item.additionalTextEdits?.map(e => ({
          range: new Range(
            e.range.start.line + 1, e.range.start.character + 1,
            e.range.end.line + 1, e.range.end.character + 1,
          ),
          text: e.newText,
        })),
      })),
    };
  }
}
```

#### Diagnostics

```typescript
// LSP Diagnostics → Monaco Markers
class LSPDiagnosticsHandler {
  handle(uri: string, diagnostics: Diagnostic[]): void {
    const model = monaco.editor.getModel(Uri.parse(uri));
    if (!model) return;

    const markers: IMarkerData[] = diagnostics.map(d => ({
      severity: this.convertSeverity(d.severity),
      message: d.message,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      source: d.source,
      code: String(d.code ?? ''),
      relatedInformation: d.relatedInformation?.map(r => ({
        resource: Uri.parse(r.location.uri),
        startLineNumber: r.location.range.start.line + 1,
        startColumn: r.location.range.start.character + 1,
        endLineNumber: r.location.range.end.line + 1,
        endColumn: r.location.range.end.character + 1,
        message: r.message,
      })),
      tags: d.tags?.map(t => t === DiagnosticTag.Unnecessary ? MarkerTag.Unnecessary : MarkerTag.Deprecated),
    }));

    monaco.editor.setModelMarkers(model, 'lsp', markers);
  }
}
```

### 3.5 LSP Performance

**Configurações de performance para LSP em projetos grandes:**

```typescript
interface LSPPerformanceConfig {
  // Sync
  sync: {
    mode: 'incremental' | 'full';   // Incremental sync (recomendado)
    maxFileSize: number;             // 5MB — acima disso usa full sync
    throttleInterval: number;        // 100ms — debounce de mudanças
  };

  // Completions
  completion: {
    maxItems: number;                // 100 — máximo de items
    triggerChars: string;            // ".", "(", "[", "#" (TypeScript)
    resolveDocs: boolean;            // Resolver documentation async
  };

  // Semantic Tokens
  semanticTokens: {
    enabled: boolean;                // true — syntax highlighting via LSP
    full: boolean;                   // full document (vs range/delta)
    delta: boolean;                  // delta updates (muda apenas o que mudou)
    legend: SemanticTokenLegend;
  };

  // Inlay Hints
  inlayHints: {
    enabled: boolean;
    maxLength: number;               // 25 chars — máximo por hint
    resolve: boolean;                // Resolver tooltips async
  };

  // Diagnostics
  diagnostics: {
    delay: number;                   // 500ms após última mudança
    maxFilesPerProject: number;      // 1000 arquivos
    maxDiagnosticsPerFile: number;   // 100 — evita flood
  };
}
```

**Estratégia de performance:**

```typescript
// Projeto pequeno (< 100 arquivos): tudo ativo
// Projeto médio (100-1000): incremental sync, delta semantic tokens
// Projeto grande (1000+): incremental sync, delta, inlay hints desligado

function getPerformanceProfile(fileCount: number): LSPPerformanceConfig {
  if (fileCount < 100) {
    return {
      sync: { mode: 'incremental', maxFileSize: 5 * 1024 * 1024, throttleInterval: 50 },
      completion: { maxItems: 100, triggerChars: '.(#[', resolveDocs: true },
      semanticTokens: { enabled: true, full: true, delta: true, legend: {} as any },
      inlayHints: { enabled: true, maxLength: 25, resolve: true },
      diagnostics: { delay: 200, maxFilesPerProject: 1000, maxDiagnosticsPerFile: 100 },
    };
  }

  if (fileCount < 1000) {
    return {
      sync: { mode: 'incremental', maxFileSize: 3 * 1024 * 1024, throttleInterval: 100 },
      completion: { maxItems: 50, triggerChars: '.(#[', resolveDocs: false },
      semanticTokens: { enabled: true, full: false, delta: true, legend: {} as any },
      inlayHints: { enabled: true, maxLength: 15, resolve: false },
      diagnostics: { delay: 500, maxFilesPerProject: 1000, maxDiagnosticsPerFile: 50 },
    };
  }

  return {
    sync: { mode: 'incremental', maxFileSize: 1 * 1024 * 1024, throttleInterval: 200 },
    completion: { maxItems: 30, triggerChars: '.(', resolveDocs: false },
    semanticTokens: { enabled: true, full: false, delta: true, legend: {} as any },
    inlayHints: { enabled: false, maxLength: 0, resolve: false },
    diagnostics: { delay: 1000, maxFilesPerProject: 1000, maxDiagnosticsPerFile: 20 },
  };
}
```

### 3.6 Multiple LSP Servers por Workspace

Workspaces podem ter múltiplos servidores LSP ativos simultaneamente (ex: TypeScript + ESLint + Tailwind CSS).

```typescript
class MultiLSPManager {
  // Ordem de resolução de features entre servidores
  private readonly FEATURE_PRIORITY: Record<string, string[]> = {
    'completion': ['typescript', 'tailwindcss', 'emmet'],
    'diagnostics': ['typescript', 'eslint', 'tslint'],
    'codeAction': ['typescript', 'eslint'],
    'hover': ['typescript', 'tailwindcss'],
    'formatting': ['typescript', 'prettier'],
  };

  async getCompletions(model: ITextModel, pos: Position): Promise<CompletionList> {
    const language = model.getLanguageId();
    const clients = this.getClientsForLanguage(language);
    const serverOrder = this.FEATURE_PRIORITY['completion'];

    // Ordena servidores pela prioridade
    const ordered = serverOrder
      .map(name => clients.find(c => c.name === name))
      .filter(Boolean) as LanguageClient[];

    // Pega completions do primeiro servidor disponível
    for (const client of ordered) {
      try {
        const result = await client.sendRequest('textDocument/completion', {
          textDocument: { uri: model.uri.toString() },
          position: { line: pos.lineNumber - 1, character: pos.column - 1 },
        });
        if (result?.items?.length) {
          return result;
        }
      } catch {
        continue; // Tenta próximo servidor
      }
    }

    return { isIncomplete: false, items: [] };
  }

  async getCodeActions(params: CodeActionParams): Promise<Command[]> {
    const actions: Command[] = [];

    // Consolida code actions de todos os servidores
    const clients = this.getClientsForLanguage(params.textDocument.uri);
    const results = await Promise.allSettled(
      clients.map(client =>
        client.sendRequest('textDocument/codeAction', params)
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        actions.push(...result.value);
      }
    }

    return actions;
  }
}
```

---

## 4. DAP (Debug Adapter Protocol)

### 4.1 DAP Spec

DAP (Debug Adapter Protocol) é um protocolo padrão para comunicação entre IDEs e debuggers. Define uma interface abstrata para debugar qualquer linguagem/runtime.

**Arquitetura DAP:**

```
┌──────────────────────────────────────────────────────────────┐
│                    DEBUG ADAPTER PROTOCOL                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  IDE (Editor/Debug UI)                    Debug Adapter        │
│  ┌──────────────────────┐     DAP JSON    ┌────────────────┐  │
│  │                      │ ◄─────────────► │                │  │
│  │  Breakpoints UI      │    Request/      │  Language      │  │
│  │  Call Stack View     │    Response      │  Specific      │  │
│  │  Variables View      │    Events        │  Debugger      │  │
│  │  Watch Expressions   │                 │  (Node, Python)│  │
│  │  Debug Console       │                 │                │  │
│  └──────────────────────┘                 └────────────────┘  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**Principais mensagens DAP:**

```
INITIALIZE:
  IDE → initialize(adapterID, linesStartAt1, columnsStartAt1, ...)
  IDE ← initialized (event)
  IDE → launch/attach(configuration)

CONTROL:
  IDE → continue(threadId)         ← continued (event)
  IDE → next(threadId)             ← stopped (event)  
  IDE → stepIn(threadId)           ← stopped (event)
  IDE → stepOut(threadId)          ← stopped (event)
  IDE → pause(threadId)            ← stopped (event)
  IDE → disconnect()               ← terminated (event)

BREAKPOINTS:
  IDE → setBreakpoints(source, breakpoints) ← SetBreakpointsResponse
  IDE → setFunctionBreakpoints(functionNames)
  IDE → setExceptionBreakpoints(filters)

STATE:
  IDE → threads()                  ← ThreadsResponse
  IDE → stackTrace(threadId)       ← StackTraceResponse
  IDE → scopes(frameId)            ← ScopesResponse
  IDE → variables(references)      ← VariablesResponse
  IDE → evaluate(expression)       ← EvaluateResponse
```

### 4.2 DAP Implementations

**Implementações suportadas no IDEIA:**

| Debugger | Tipo | Comando | Features |
|----------|------|---------|----------|
| Node.js (vscode-js-debug) | JavaScript/TypeScript | `js-debug` | Breakpoints, step, evaluate, REPL, async stack |
| Python (debugpy) | Python | `debugpy` | Full DAP, conditional breakpoints, Django/Flask |
| C/C++ (cpptools) | C/C++ | `OpenDebugAD7` | Native debugging, attach to process |
| C# (netcoredbg) | C# / .NET | `netcoredbg` | Full DAP, attach, expression evaluation |
| Go (delve) | Go | `dlv dap` | Full DAP, goroutines, core dump |
| Rust (lldb-dap / codelldb) | Rust | `lldb-dap` | Full DAP, native debugging |
| Java (java-debug) | Java | `java-debug` | Full DAP, hot code replace |
| PHP (php-debug) | PHP | `php-debug` | XDebug integration |
| Ruby (ruby-debug-ide) | Ruby | `ruby-debug-ide` | debase + debase-ruby_core_source |

**Launch configuration:**

```typescript
interface DebugConfiguration {
  type: string;                    // "node", "python", "cppdbg"
  name: string;                    // "Debug Server"
  request: 'launch' | 'attach';    // Launch new process or attach
  program?: string;                // Script to launch
  args?: string[];                 // Command-line arguments
  cwd?: string;                    // Working directory
  env?: Record<string, string>;    // Environment variables
  runtimeExecutable?: string;      // "node", "python3"
  runtimeArgs?: string[];          // --inspect, etc.
  stopOnEntry?: boolean;           // Stop at entry point
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  internalConsoleOptions?: 'neverOpen' | 'openOnFirstSessionStart' | 'openOnSessionStart';

  // Language-specific
  sourceMaps?: boolean;            // TypeScript source maps
  outFiles?: string[];             // Compiled output
  justMyCode?: boolean;            // Skip library code
  presentation?: {
    hidden?: boolean;
    group?: string;
    order?: number;
  };
}
```

### 4.3 Debug UI

**Componentes da UI de debug no IDEIA:**

```
┌─────────────────────────────────────────────────────────────┐
│  DEBUG PERSPECTIVE                                            │
├──────────────┬───────────────────────────────┬──────────────┤
│  VARIABLES    │        EDITOR                   │  WATCH      │
│               │                                │              │
│  Locals:      │  function add(a, b) {          │  x          │
│  ├── a: 5     │  → const x = a + b;  ← break   │  y          │
│  ├── b: 3     │    return x * 2;                │              │
│  ├── x: 8     │  }                              │              │
│               │                                │              │
│  Closure:     │  ── BREAKPOINT HIT ──          │              │
│  ├── this     │  Paused on line 2              │              │
│               │                                │              │
├──────────────┼───────────────────────────────┼──────────────┤
│  CALL STACK   │                                │  BREAKPOINTS │
│               │                                │              │
│  add() L2     │                                │  ☑ src/...   │
│  main() L10   │                                │  ☐ lib/...   │
│  <global>     │                                │              │
│               │                                │              │
├──────────────┴───────────────────────────────┴──────────────┤
│  DEBUG CONSOLE                                               │
│  > x + y                                                     │
│  = 13                                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Implementação dos componentes:**

```typescript
// Breakpoints Gutter (no Monaco)
class DebugBreakpointsGutter {
  private breakpoints: Map<string, Map<number, IBreakpoint>> = new Map();
  private decorations: Map<string, string[]> = new Map();

  addBreakpoint(uri: string, line: number): void {
    const model = monaco.editor.getModel(Uri.parse(uri));
    if (!model) return;

    if (!this.breakpoints.has(uri)) {
      this.breakpoints.set(uri, new Map());
    }
    this.breakpoints.get(uri)!.set(line, { enabled: true, condition: undefined });

    // Atualiza gutter decoration
    this.updateDecorations(model, uri);

    // Notifica DAP
    this.debugSession?.setBreakpoints({
      source: { path: Uri.parse(uri).fsPath },
      breakpoints: Array.from(this.breakpoints.get(uri)!.values()),
    });
  }

  private updateDecorations(model: ITextModel, uri: string): void {
    const bps = this.breakpoints.get(uri);
    if (!bps) return;

    const decorations = Array.from(bps.entries()).map(([line, bp]) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: bp.enabled
          ? 'codicon-debug-breakpoint'
          : 'codicon-debug-breakpoint-disabled',
        glyphMarginHoverMessage: { value: bp.condition ? `Condition: ${bp.condition}` : 'Breakpoint' },
      },
    }));

    this.decorations.set(uri, model.deltaDecorations(
      this.decorations.get(uri) ?? [],
      decorations,
    ));
  }
}

// Stack Trace View
class StackTraceView implements DebugUIComponent {
  render(state: DebugState): React.ReactNode {
    return (
      <div className="stack-trace">
        <h3>Call Stack</h3>
        {state.threads.map(thread => (
          <div key={thread.id} className={`thread ${thread.paused ? 'paused' : 'running'}`}>
            <span className="thread-name">{thread.name}</span>
            <span className="thread-status">
              {thread.paused ? '⏸ Paused' : '▶ Running'}
            </span>
            {thread.paused && (
              <div className="frames">
                {thread.stackFrames?.map((frame, i) => (
                  <div
                    key={frame.id}
                    className={`frame ${i === 0 ? 'active' : ''}`}
                    onClick={() => this.jumpToFrame(frame)}
                  >
                    <span className="frame-name">{frame.name}</span>
                    <span className="frame-location">
                      {path.basename(frame.source?.path ?? '')}:{frame.line}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
}
```

### 4.4 Launch Configurations (.vscode/launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Server",
      "runtimeExecutable": "node",
      "runtimeArgs": ["--inspect=9229"],
      "program": "${workspaceFolder}/dist/server.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal",
      "presentation": {
        "group": "servers",
        "order": 1
      }
    },
    {
      "type": "python",
      "request": "launch",
      "name": "Debug Python App",
      "program": "${workspaceFolder}/app.py",
      "args": ["--port", "5000"],
      "console": "integratedTerminal",
      "justMyCode": true
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "processId": "${command:PickProcess}",
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests (Vitest)",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vitest", "--inspect=9230"],
      "program": "${workspaceFolder}/vitest.config.ts",
      "console": "integratedTerminal",
      "presentation": {
        "group": "tests",
        "order": 1
      }
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Debug API Server", "Debug Python App"],
      "stopAll": true
    }
  ]
}
```

### 4.5 Multi-Session Debugging

```typescript
class MultiSessionManager {
  private sessions: Map<string, DebugSession> = new Map();

  async startSession(name: string, config: DebugConfiguration): Promise<void> {
    const session = new DebugSession(config);

    session.on('stopped', (event) => {
      this.activeSession = session;
      this.ui.updateStackTrace(event.threadId);
    });

    session.on('terminated', () => {
      this.sessions.delete(name);
      this.ui.updateSessionStatus(name, 'terminated');
    });

    await session.start();
    this.sessions.set(name, session);

    // Se for compound, verifica se todas estão rodando
    this.checkCompoundState();
  }

  // Switch entre sessions ativas
  activateSession(name: string): void {
    const session = this.sessions.get(name);
    if (!session) return;

    this.activeSession = session;
    this.ui.updateStackTrace(session.lastStoppedThreadId);
    this.ui.updateVariables(session.lastStoppedFrameId);
  }

  // Ações em todas as sessions
  async continueAll(): Promise<void> {
    for (const [name, session] of this.sessions) {
      if (session.state === 'paused') {
        await session.continue();
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const [name, session] of this.sessions) {
      await session.disconnect();
    }
    this.sessions.clear();
  }
}
```

---

## 5. Task Runner

### 5.1 VS Code Tasks (.vscode/tasks.json)

Tasks permitem configurar comandos de build, test, lint etc. como tarefas executáveis no terminal.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build TypeScript",
      "type": "shell",
      "command": "npx tsc --noEmit",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "clear": true
      },
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "npx vitest run",
      "group": "test",
      "presentation": {
        "reveal": "silent",
        "panel": "new"
      },
      "problemMatcher": ["$vitest"]
    },
    {
      "label": "Lint Check",
      "type": "shell",
      "command": "npx biome check src/",
      "problemMatcher": ["$biome"]
    },
    {
      "label": "Dev Server",
      "type": "shell",
      "command": "npm run dev",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": ".",
          "file": 1,
          "location": 2,
          "message": 3
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Starting development server",
          "endsPattern": "Compiled successfully"
        }
      }
    }
  ]
}
```

### 5.2 Problem Matchers

```typescript
interface ProblemMatcher {
  name: string;
  source?: string;
  owner: string;
  severity?: 'error' | 'warning' | 'info';
  applyTo: 'allDocuments' | 'openDocuments' | 'closedDocuments';
  pattern: ProblemPattern | ProblemPattern[];
  background?: BackgroundMonitor;
  watching?: WatchingMatcher;
}

interface ProblemPattern {
  regexp: string;
  file?: number;           // 1
  location?: number;       // line:col or line,col
  line?: number;           // linha (se location não tem)
  column?: number;         // coluna (se location não tem)
  endLine?: number;
  endColumn?: number;
  severity?: number;       // "error", "warning", "info"
  code?: number;           // código do erro
  message: number;         // mensagem (obrigatório)
  loop?: boolean;          // múltiplos matches
}

// Problem matcher built-in do IDEIA
const MATCHERS: Record<string, ProblemMatcher> = {
  '$tsc': {
    name: 'TypeScript Compiler',
    owner: 'typescript',
    source: 'ts',
    applyTo: 'allDocuments',
    pattern: {
      regexp: '^(.+)\\((\\d+,\\d+)\\):\\s+(error|warning|info)\\s+(TS\\d+):\\s+(.+)$',
      file: 1,
      location: 2,
      severity: 3,
      code: 4,
      message: 5,
    },
  },
  '$eslint-stylish': {
    name: 'ESLint Stylish',
    owner: 'eslint',
    source: 'eslint',
    applyTo: 'openDocuments',
    pattern: [
      {
        regexp: '^\\s+(\\d+):(\\d+)\\s+(error|warning)\\s+(.+)$',
        line: 1,
        column: 2,
        severity: 3,
        message: 4,
        loop: true,
      },
      {
        regexp: '^(.+)$',
        file: 1,
      },
    ],
  },
};
```

### 5.3 Build Tasks, Test Tasks, Custom Tasks

```typescript
class TaskRunner {
  private running: Map<string, TerminalProcess> = new Map();

  async runTask(task: TaskDefinition): Promise<void> {
    const terminal = this.createTaskTerminal(task.label);

    // Configura problem matcher
    const matcher = task.problemMatcher
      ? this.problemMatcherRegistry.get(task.problemMatcher)
      : null;

    if (matcher) {
      terminal.onData((data) => {
        const problems = matcher.match(data);
        for (const problem of problems) {
          this.diagnosticManager.addProblem(problem);
        }
      });
    }

    // Executa comando
    terminal.write(`${task.command} ${task.args?.join(' ') ?? ''}\n`);

    this.running.set(task.label, terminal);

    // Task background fica ativa até ser parada
    if (!task.isBackground) {
      await terminal.waitForExit();
      this.running.delete(task.label);
    }
  }

  stopTask(label: string): void {
    const terminal = this.running.get(label);
    if (terminal) {
      terminal.write('\x03'); // Ctrl+C
      terminal.kill();
      this.running.delete(label);
    }
  }

  private createTaskTerminal(label: string): TerminalProcess {
    const term = new TerminalProcess({
      cwd: workspace.root,
      cols: 80,
      rows: 24,
    });

    // Cria view de terminal no IDEIA
    this.terminalManager.createTerminalView({
      id: `task:${label}`,
      name: `Task: ${label}`,
      process: term,
    });

    return term;
  }
}
```

### 5.4 Background Tasks (Watchers, Compilers)

```typescript
// Tasks background (watchers) são tasks que ficam rodando
// e disparam eventos quando detectam mudanças

interface BackgroundTask {
  label: string;
  type: 'watch' | 'compile' | 'dev-server';
  command: string;
  args: string[];
  patterns: {
    begin: RegExp;   // "Starting watcher..."
    end: RegExp;     // "Compilation complete" | null = runs forever
    error: RegExp;   // "Error: ..."
  };
}

const WATCHER_TASKS: BackgroundTask[] = [
  {
    label: 'TypeScript Watch',
    type: 'watch',
    command: 'npx tsc',
    args: ['--watch', '--noEmit'],
    patterns: {
      begin: /Starting compilation/,
      end: /Found \d+ errors?/,
      error: /error TS\d+/,
    },
  },
  {
    label: 'Vitest Watch',
    type: 'watch',
    command: 'npx vitest',
    args: ['--watch'],
    patterns: {
      begin: /Watch mode started/,
      end: null, // roda para sempre
      error: /FAIL/,
    },
  },
  {
    label: 'Dev Server',
    type: 'dev-server',
    command: 'npm',
    args: ['run', 'dev'],
    patterns: {
      begin: /Starting development server/,
      end: null,
      error: /Error|Failed/,
    },
  },
];
```

---

## 6. Integração com Agentes IDEIA

### 6.1 Agente Pode Executar Comandos no Terminal

Agentes podem usar o terminal integrado para executar comandos e receber output.

```typescript
@injectable()
export class AgentTerminalBridge {
  @inject(TerminalManager)
  private terminalManager: TerminalManager;

  @inject(AutonomyPolicy)
  private autonomyPolicy: AutonomyPolicy;

  async execCommand(
    agentId: string,
    command: string,
    options?: {
      cwd?: string;
      timeout?: number;
      captureOutput?: boolean;
    },
  ): Promise<CommandResult> {
    // Policy check
    const allowed = await this.autonomyPolicy.check(
      agentId,
      'exec_command',
      command,
    );

    if (!allowed) {
      return {
        success: false,
        error: 'Command execution blocked by autonomy policy',
        exitCode: -1,
        stdout: '',
        stderr: '',
      };
    }

    // Cria terminal dedicado para o agente
    const term = this.terminalManager.createAgentTerminal(agentId, {
      cwd: options?.cwd ?? workspace.root,
      captureOutput: options?.captureOutput ?? true,
    });

    // Executa comando
    term.write(`${command}\n`);

    // Aguarda conclusão ou timeout
    const result = await Promise.race([
      term.waitForExit(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), options?.timeout ?? 30000)
      ),
    ]);

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: term.getCapturedOutput(),
      stderr: term.getCapturedError(),
      duration: result.duration,
    };
  }

  async readCommandOutput(
    agentId: string,
    command: string,
  ): Promise<CommandOutput> {
    const result = await this.execCommand(agentId, command, {
      captureOutput: true,
    });

    // Parse output para extrair informações estruturadas
    return {
      raw: result.stdout + result.stderr,
      lines: result.stdout.split('\n'),
      exitCode: result.exitCode,
      success: result.success,
      parsed: this.parseOutput(command, result.stdout),
    };
  }

  private parseOutput(command: string, output: string): Record<string, unknown> {
    // Detecta tipo de comando e faz parse estruturado
    if (command.startsWith('npm test') || command.startsWith('npx vitest')) {
      return this.parseTestOutput(output);
    }
    if (command.startsWith('npx tsc')) {
      return this.parseTypeScriptOutput(output);
    }
    if (command.startsWith('git')) {
      return this.parseGitOutput(output);
    }
    return { raw: output };
  }
}
```

### 6.2 Agente Pode Analisar Output de Compilação/Testes

```typescript
@injectable()
export class AgentCompilationAnalyzer {
  @inject(AgentTerminalBridge)
  private terminal: AgentTerminalBridge;

  async analyzeAndFix(errors: Diagnostic[]): Promise<void> {
    // Agrupa erros por arquivo
    const byFile = this.groupByFile(errors);

    for (const [file, fileErrors] of Object.entries(byFile)) {
      const result = await this.agentService.requestFix({
        agent: 'programmer',
        task: 'fix_compilation_errors',
        context: {
          file,
          errors: fileErrors,
          fileContent: await fs.readFile(file, 'utf-8'),
        },
      });

      if (result.confidence > 0.8) {
        await this.terminal.execCommand(
          'programmer',
          `npx biome check --write ${file}`,
        );
      }
    }
  }

  async suggestTestFixes(): Promise<void> {
    const testResult = await this.terminal.readCommandOutput(
      'tester',
      'npx vitest run --reporter=json',
    );

    const failedTests = testResult.parsed.failedTests as any[];

    for (const test of failedTests) {
      const suggestion = await this.agentService.request({
        agent: 'tester',
        task: 'fix_test',
        context: {
          testFile: test.file,
          testName: test.name,
          error: test.errorMessage,
          testCode: await fs.readFile(test.file, 'utf-8'),
        },
      });

      this.ui.showTestFixSuggestion(test, suggestion);
    }
  }

  private groupByFile(errors: Diagnostic[]): Record<string, Diagnostic[]> {
    return errors.reduce((acc, err) => {
      const file = err.file || 'unknown';
      (acc[file] ??= []).push(err);
      return acc;
    }, {} as Record<string, Diagnostic[]>);
  }
}
```

### 6.3 Agente Pode Debugar

Agentes podem controlar sessões de debug (set breakpoints, step, evaluate).

```typescript
@injectable()
export class AgentDebugController {
  @inject(DebugSessionManager)
  private debugManager: DebugSessionManager;

  async debugCode(
    agentId: string,
    options: {
      file: string;
      line?: number;
      expression?: string;
      context?: string;
    },
  ): Promise<DebugResult> {
    // Inicia sessão de debug
    const session = await this.debugManager.startSession({
      type: 'node',
      request: 'launch',
      name: `Agent Debug: ${agentId}`,
      program: options.file,
      stopOnEntry: true,
    });

    // Set breakpoint na linha desejada ou na primeira
    const breakLine = options.line ?? 1;
    await session.setBreakpoints({
      source: { path: options.file },
      breakpoints: [{ line: breakLine }],
    });

    // Continua execução
    await session.continue();

    // Aguarda breakpoint
    const stopped = await session.waitForStop();
    if (!stopped) {
      return { success: false, error: 'Breakpoint not hit' };
    }

    // Evaluate expression
    if (options.expression) {
      const result = await session.evaluate({
        expression: options.expression,
        frameId: stopped.frameId,
      });

      return {
        success: true,
        variables: await session.getVariables(stopped.frameId),
        evaluated: result.result,
        stackTrace: stopped.stackFrames,
      };
    }

    return {
      success: true,
      variables: await session.getVariables(stopped.frameId),
      stackTrace: stopped.stackFrames,
    };
  }

  async smartDebug(
    error: { message: string; stack?: string; file?: string; line?: number },
  ): Promise<SmartDebugResult> {
    const agent = this.agentService.getAgent('programmer');

    // 1. Analisa o erro e decide abordagem
    const analysis = await agent.analyze({
      task: 'analyze_error',
      context: error,
    });

    // 2. Se for simples, gera fix direto
    if (analysis.confidence > 0.9) {
      return {
        approach: 'direct_fix',
        suggestion: analysis.suggestion,
        code: analysis.fixedCode,
      };
    }

    // 3. Se for complexo, entra em modo debug
    const debugInfo = await this.iterateDebug(
      error.file!,
      error.line ?? 1,
      analysis.investigationPlan,
    );

    return {
      approach: 'debug_iteration',
      investigationPlan: analysis.investigationPlan,
      debugResults: debugInfo,
      rootCause: debugInfo.rootCause,
      suggestion: agent.generateFix(debugInfo.rootCause),
    };
  }

  private async iterateDebug(
    file: string,
    startLine: number,
    plan: InvestigationStep[],
  ): Promise<DebugIterationResult> {
    const session = await this.debugManager.startSession({
      type: 'node',
      request: 'launch',
      name: 'Smart Debug',
      program: file,
    });

    const results: StepResult[] = [];

    for (const step of plan) {
      await session.setBreakpoints({
        source: { path: file },
        breakpoints: [{ line: step.breakLine }],
      });

      await session.continue();
      const stopped = await session.waitForStop();

      if (!stopped) break;

      const variables = await session.getVariables(stopped.frameId);
      const evaluation = await session.evaluate({
        expression: step.evaluateExpression,
        frameId: stopped.frameId,
      });

      results.push({
        step: step.description,
        variables,
        evaluation: evaluation.result,
        satisfied: this.evaluateCondition(step.condition, variables, evaluation.result),
      });
    }

    await session.disconnect();
    return {
      steps: results,
      rootCause: this.determineRootCause(results),
    };
  }
}
```

### 6.4 Agente Pode Ler Logs e Sugerir Correções

```typescript
@injectable()
export class AgentLogAnalyzer {
  async analyzeAndSuggest(terminalOutput: string): Promise<LogAnalysis> {
    // Categoriza linhas do log
    const errors = this.extractErrors(terminalOutput);
    const warnings = this.extractWarnings(terminalOutput);
    const traces = this.extractStackTraces(terminalOutput);

    // Analisa cada erro com o agente programador
    const suggestions = await Promise.all(
      errors.map(async (error) => {
        const response = await agentService.request({
          agent: 'programmer',
          task: 'analyze_error',
          context: {
            errorMessage: error.message,
            stackTrace: error.stackTrace,
            surroundingCode: await this.getSurroundingCode(error),
          },
        });

        return {
          error: error.message,
          file: error.file,
          line: error.line,
          cause: response.rootCause,
          fix: response.suggestedFix,
          confidence: response.confidence,
          autoFixable: response.confidence > 0.85,
        };
      }),
    );

    return {
      totalErrors: errors.length,
      autoFixable: suggestions.filter(s => s.autoFixable).length,
      suggestions: suggestions.filter(s => s.confidence > 0.5),
      summary: this.generateSummary(suggestions),
    };
  }

  private extractStackTraces(output: string): StackTrace[] {
    const traceRegex = /(\S+:\d+:\d+)\s+at\s+(\S+)\s+\((\S+:\d+:\d+)\)/g;
    const traces: StackTrace[] = [];
    let match;

    while ((match = traceRegex.exec(output)) !== null) {
      traces.push({
        location: match[1],
        function: match[2],
        source: match[3],
      });
    }

    return traces;
  }
}
```

### 6.5 Terminal Compartilhado (Humano + Agente)

O terminal pode ser compartilhado entre humano e agente, permitindo colaboração síncrona:

```typescript
@injectable()
export class SharedTerminal {
  private humanInput: string[] = [];
  private agentInput: string[] = [];
  private currentUser: 'human' | 'agent' = 'human';

  constructor(private term: TerminalProcess) {
    // Captura input humano
    this.term.onHumanInput((data) => {
      this.humanInput.push(data);
    });

    // Canal para input do agente
    this.term.onAgentInput((data) => {
      this.agentInput.push(data);
    });

    // Alterna entre usuários
    this.term.onToggleUser(() => {
      this.currentUser = this.currentUser === 'human' ? 'agent' : 'human';
      this.updatePrompt();
    });
  }

  async collaborativeSession(agentId: string): Promise<void> {
    // Modo colaborativo: humano e agente alternam no mesmo terminal

    while (true) {
      // Humano digita comando
      this.currentUser = 'human';
      this.updatePrompt();

      const humanCommand = await this.waitForHumanInput();

      if (humanCommand === '/agent') {
        // Passa controle para o agente
        this.currentUser = 'agent';
        this.updatePrompt();

        const agentCommands = await this.agentService.getAgent(agentId)
          .planCommands(humanCommand.replace('/agent ', ''));

        for (const cmd of agentCommands) {
          this.term.write(`${cmd}\n`);
          await this.waitForCompletion();

          // Humano pode interromper a qualquer momento
          if (this.humanInterrupted) break;
        }

        this.currentUser = 'human';
        this.updatePrompt();
      }
    }
  }

  private updatePrompt(): void {
    const prompt = this.currentUser === 'human'
      ? '\x1b[32m$\x1b[0m '  // Verde para humano
      : '\x1b[34m[agent]$\x1b[0m '; // Azul para agente
    this.term.write(prompt);
  }
}
```

---

## Apêndice A: Terminal Configuration Default

```typescript
const DEFAULT_TERMINAL_CONFIG = {
  // xterm.js settings
  cursorBlink: true,
  cursorStyle: 'bar',
  fontSize: 14,
  fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", "Consolas", monospace',
  lineHeight: 1.3,
  letterSpacing: 0,
  scrollback: 5000,
  smoothScrollDuration: 100,
  fastScrollModifier: 'alt',
  fastScrollSensitivity: 5,

  // Renderer
  rendererType: 'canvas',
  allowTransparency: false,
  windowsMode: process.platform === 'win32',

  // Shell
  shell: detectShell().path,
  shellArgs: detectShell().args,
  shellIntegration: true,

  // Environment
  env: {
    TERM: 'xterm-256color',
    TERM_PROGRAM: 'IDEIA',
    TERM_PROGRAM_VERSION: '1.0.0',
    COLORTERM: 'truecolor',
  },

  // Theme
  theme: 'ideia-dark',
  themes: IDEIA_THEMES,

  // Behavior
  rightClickSelectsWord: true,
  overviewRuler: true,
  overviewRulerWidth: 8,
  copyOnSelection: true,
  pasteOnRightClick: true,
};
```

## Apêndice B: Referências

| Referência | Ano | Descrição |
|------------|-----|-----------|
| xterm.js | 2025 | https://github.com/xtermjs/xterm.js |
| node-pty | 2025 | https://github.com/microsoft/node-pty |
| LSP Specification 3.18 | 2024 | https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/ |
| DAP Specification 1.59 | 2024 | https://microsoft.github.io/debug-adapter-protocol/specification |
| ConPTY (Microsoft) | 2024 | https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/ |
| VS Code Debug Architecture | 2025 | https://code.visualstudio.com/api/extension-guides/debugger-extension |
| Monaco Editor | 2025 | https://microsoft.github.io/monaco-editor/ |

---

## Intensificação: Roteiro de Implementação

### Tasks Geradas

1. **Implementar LSP Code Actions Provider (`packages/lsp/`)**
   - Provider para quick fixes, refactors e source actions em 5 linguagens
   - Integração com Monaco Editor via `monaco-languageclient`
   - Comandos VS Code API `codeAction` registrados no Theia
   - Base: seção 3 (LSP), tabela de providers LSP

2. **Implementar DAP Variable Watch + Data Breakpoints**
   - Painel de variáveis com watch expressions e data breakpoints
   - Suporte a `setVariable`, `evaluate`, `setExpression` requests
   - TreeView hierárquico de escopos (local, closure, global)
   - Base: seção 4 (DAP), requests DAP `variables`, `scopes`, `evaluate`

3. **Implementar Terminal Split Panes**
   - Split horizontal/vertical com drag-and-drop
   - Addon xterm.js para multiplexação de sessões
   - Suporte a múltiplos perfis (bash, pwsh, agent terminal)
   - Base: seção 1 (xterm.js), seção 2 (node-pty)

4. **Implementar DebugPanel completo no Theia**
   - Widget Debug com breakpoints, stack trace, variáveis, console REPL
   - Integração com DAP adapter para Node.js, Python, Go
   - Suporte a launch configurations (`.ideia-debug.json`)
   - Base: seção 4 (DAP), seção 6 (integração com agentes)

5. **Implementar LSP Semantic Tokens**
   - Provider `documentSemanticTokens` para coloring avançado
   - Suporte a token modifiers (declaration, definition, readonly, static)
   - Integração com Tree-sitter queries como fallback
   - Base: seção 3.5 (LSP semantic tokens), seção 3.8 (Tree-sitter)

6. **Implementar Task Runner com Output Parsing**
   - Runner integrado ao terminal com parsing de `ProblemMatcher`
   - Suporte a `tasks.json` compatível com VS Code
   - Build/Test tasks com output navegável (click-to-file)
   - Base: seção 5 (Task Runner), seção 1.4 (xterm addons)

7. **Implementar Agent-Integrated Terminal**
   - Terminal que agentes IDEIA podem ler/escrever programaticamente
   - Comando `/terminal` no chat para execução em sessão existente
   - Captura de output estruturado para context-aware agents
   - Base: seção 6 (integração com agentes), seção 2.4 (PTY bridge)

### Tecnologias Recomendadas

| Prioridade | Tecnologia | Uso | Justificativa |
|------------|-----------|-----|---------------|
| P0 | xterm.js 5.x | Terminal frontend | Base do Theia/VS Code, addons maduros |
| P0 | node-pty 1.x | PTY backend | Única opção madura para pseudo-terminais Node.js |
| P0 | monaco-languageclient | LSP bridge | Integração nativa Monaco ↔ LSP com Theia |
| P1 | DAP 1.59.x | Debug protocol | Padrão da indústria, compatível VS Code |
| P1 | Tree-sitter | Parsing offline | Fallback quando LSP não disponível |
| P2 | ConPTY (Win32) | Windows PTY | Necessário para suporte nativo Windows |
| P2 | WebGLRenderer | GPU terminal | Performance em terminais com muita saída |

### Conexões com Estudos

- **S21** (Terminal/Debug) — Este estudo é o S21, referência central para terminal e debug
- **S11** (Theia IDE) — Integração dos widgets DebugPanel e Terminal no Theia plugin
- **S10v2** (Contratos) — Contratos C9 (Monaco↔LSP), C10 (Tree-sitter), C11 (xterm.js↔node-pty)
- **G5** (LSP) — 8 LSP providers implementados, base para code actions
- **G8** (DAP) — DebugPanel funcional, expandir com variable watch
- **E4** (UX) — Split panes e temas de terminal impactam experiência do usuário

### Riscos de Implementação

1. **node-pty em Windows sem compilação nativa** — node-pty exige compilação C++ (node-gyp), pode falhar em ambientes restritos. Mitigação: fornecer binary pré-compilado ou fallback para `spawn()` com pipes raw.
2. **Performance de LSP em arquivos grandes** — Semantic tokens e code actions em arquivos >10K linhas podem travar o editor. Mitigação: debounce + cancellation tokens + timeout configurável.
3. **DAP inconsistente entre linguagens** — Cada debug adapter implementa DAP de forma diferente; `setVariable` e `dataBreakpoints` não são universais. Mitigação: capability negotiation inicial + fallback UI genérica.
4. **Conflito de focus entre terminal split e editor** — Múltiplos terminais em split podem causar perda de foco do teclado. Mitigação: gerenciamento de foco via `xterm.js` focus handler + Theia `WidgetManager`.
5. **Segurança de terminal de agente** — Agente com acesso a terminal pode executar comandos destrutivos. Mitigação: sandbox com policy engine (seção 6.3), approval flow para comandos de alto risco.
