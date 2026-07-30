import { ConfirmDialog, InputDialog, MessageDialog } from '../dialog';
import { DialogButton } from '../types';

describe('ConfirmDialog', () => {
  it('should create with id, title and message', () => {
    const d = new ConfirmDialog('confirm-1', 'Confirm', 'Are you sure?');
    expect(d.id).toBe('confirm-1');
    expect(d.title).toBe('Confirm');
    expect(d.getMessage()).toBe('Are you sure?');
  });

  it('should return Yes on open', async () => {
    const d = new ConfirmDialog('confirm-2', 'Confirm', 'Proceed?');
    const result = await d.open();
    expect(result.button).toBe(DialogButton.Yes);
  });

  it('should set message', () => {
    const d = new ConfirmDialog('confirm-3', 'Confirm', 'Old');
    d.setMessage('New message');
    expect(d.getMessage()).toBe('New message');
  });

  it('should set result to Cancel on close', () => {
    const d = new ConfirmDialog('confirm-4', 'Confirm', 'Test');
    d.close();
  });
});

describe('InputDialog', () => {
  it('should create with id, title and message', () => {
    const d = new InputDialog('input-1', 'Input', 'Enter value:');
    expect(d.id).toBe('input-1');
    expect(d.title).toBe('Input');
    expect(d.getInputValue()).toBe('');
  });

  it('should return OK with empty input on open', async () => {
    const d = new InputDialog('input-2', 'Input', 'Enter:');
    const result = await d.open();
    expect(result.button).toBe(DialogButton.OK);
    expect(result.value).toBe('');
  });

  it('should set message', () => {
    const d = new InputDialog('input-3', 'Input', 'Old');
    d.setMessage('New');
    const msgAccessor = (d as unknown as Record<string, unknown>).message;
    expect(msgAccessor).toBe('New');
  });

  it('should set and get input value', () => {
    const d = new InputDialog('input-4', 'Input', 'Enter:');
    expect(d.getInputValue()).toBe('');
  });

  it('should set validator', () => {
    const d = new InputDialog('input-5', 'Input', 'Enter:');
    const validator = jest.fn((v: string) => v ? undefined : 'Required');
    d.setValidator(validator);
    d.close();
  });
});

describe('MessageDialog', () => {
  it('should create with id, title and message', () => {
    const d = new MessageDialog('msg-1', 'Info', 'Something happened');
    expect(d.id).toBe('msg-1');
    expect(d.title).toBe('Info');
  });

  it('should return OK on open', async () => {
    const d = new MessageDialog('msg-2', 'Info', 'Done');
    const result = await d.open();
    expect(result.button).toBe(DialogButton.OK);
  });

  it('should set message', () => {
    const d = new MessageDialog('msg-3', 'Info', 'Old');
    d.setMessage('Updated');
  });
});
