import { Envelope, SerializationFormat } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('protobuf-protocol-handler');

export class ProtobufProtocolHandler {
  private _encoder = new TextEncoder();
  private _decoder = new TextDecoder();

  serialize(msg: Envelope): Uint8Array {
    const json = this._encoder.encode(JSON.stringify(msg));
    const header = this._encoder.encode('prot');
    const result = new Uint8Array(header.length + json.length);
    result.set(header, 0);
    result.set(json, header.length);
    return result;
  }

  deserialize<T = unknown>(data: Uint8Array): T {
    const header = this._decoder.decode(data.slice(0, 4));
    if (header === 'prot') {
      return JSON.parse(this._decoder.decode(data.slice(4))) as T;
    }
    return JSON.parse(this._decoder.decode(data)) as T;
  }

  detectFormat(data: Uint8Array): SerializationFormat {
    const header = this._decoder.decode(data.slice(0, 4));
    if (header === 'prot') return SerializationFormat.PROTOBUF;
    return SerializationFormat.JSON;
  }

  encodeField(value: unknown): Uint8Array {
    const json = JSON.stringify(value);
    return this._encoder.encode(json);
  }

  decodeField<T>(data: Uint8Array): T {
    return JSON.parse(this._decoder.decode(data)) as T;
  }

  getSize(msg: Envelope): number {
    return this.serialize(msg).length;
  }
}
