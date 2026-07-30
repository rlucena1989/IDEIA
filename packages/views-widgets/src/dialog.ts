import { IDialog, DialogResult, DialogButton } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('dialog');

export class ConfirmDialog implements IDialog {
  readonly id: string;
  readonly title: string;
  private message: string;
  private result?: DialogResult;

  constructor(id: string, title: string, message: string) {
    this.id = id;
    this.title = title;
    this.message = message;
  }

  setMessage(message: string): void {
    this.message = message;
  }

  getMessage(): string {
    return this.message;
  }

  async open(): Promise<DialogResult> {
    return { button: DialogButton.Yes };
  }

  close(): void {
    this.result = { button: DialogButton.Cancel };
  }
}

export class InputDialog implements IDialog {
  readonly id: string;
  readonly title: string;
  private message: string;
  private inputValue = '';
  private validator?: (value: string) => string | undefined;
  private result?: DialogResult;

  constructor(id: string, title: string, message: string) {
    this.id = id;
    this.title = title;
    this.message = message;
  }

  setMessage(message: string): void {
    this.message = message;
  }

  setValidator(validator: (value: string) => string | undefined): void {
    this.validator = validator;
  }

  getInputValue(): string {
    return this.inputValue;
  }

  async open(): Promise<DialogResult> {
    return { button: DialogButton.OK, value: this.inputValue };
  }

  close(): void {
    this.result = { button: DialogButton.Cancel };
  }
}

export class MessageDialog implements IDialog {
  readonly id: string;
  readonly title: string;
  private message: string;
  private result?: DialogResult;

  constructor(id: string, title: string, message: string) {
    this.id = id;
    this.title = title;
    this.message = message;
  }

  setMessage(message: string): void {
    this.message = message;
  }

  async open(): Promise<DialogResult> {
    return { button: DialogButton.OK };
  }

  close(): void {
    this.result = { button: DialogButton.Cancel };
  }
}
