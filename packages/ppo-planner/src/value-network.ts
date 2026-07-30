class ValueLinearLayer {
  private _weights: Float32Array;
  private _bias: Float32Array;

  constructor(inputDim: number, outputDim: number) {
    const scale = Math.sqrt(2.0 / inputDim);
    this._weights = new Float32Array(inputDim * outputDim);
    this._bias = new Float32Array(outputDim);
    for (let i = 0; i < this._weights.length; i++) {
      this._weights[i] = (Math.random() * 2 - 1) * scale;
    }
  }

  forward(input: Float32Array): Float32Array {
    const rows = this._bias.length;
    const cols = this._weights.length / rows;
    const output = new Float32Array(rows);
    for (let j = 0; j < rows; j++) {
      let sum = this._bias[j];
      for (let i = 0; i < cols; i++) {
        sum += input[i] * this._weights[i * rows + j];
      }
      output[j] = sum;
    }
    return output;
  }
}

export class ValueNetwork {
  private readonly _layers: ValueLinearLayer[];

  constructor() {
    this._layers = [
      new ValueLinearLayer(138, 256), new ValueLinearLayer(256, 128),
      new ValueLinearLayer(128, 64), new ValueLinearLayer(64, 1),
    ];
  }

  forward(state: Float32Array): number {
    let x = state;
    for (let i = 0; i < this._layers.length - 1; i++) {
      x = this._layers[i].forward(x);
      x = new Float32Array(x.map(v => Math.tanh(v)));
    }
    const output = this._layers[this._layers.length - 1].forward(x);
    return output[0] ?? 0;
  }

  evaluate(states: Float32Array[]): Float32Array {
    const values = new Float32Array(states.length);
    for (let i = 0; i < states.length; i++) {
      values[i] = this.forward(states[i]);
    }
    return values;
  }
}
