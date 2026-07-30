import { EditorPreferences } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('editor-preferences');

export class DefaultEditorPreferences implements EditorPreferences {
  tabSize = 4;
  insertSpaces = true;
  wordWrap: 'off' | 'on' | 'wordWrapColumn' = 'off';
  lineNumbers: 'on' | 'off' | 'relative' = 'on';
  minimap = { enabled: true, maxColumn: 120 };
  fontSize = 14;
  fontFamily = "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace";
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange' = 'afterDelay';
  autoSaveDelay = 1000;
  autoSaveOnFocusChange = true;
  formatOnSave = true;
  formatOnPaste = false;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid' = 'blink';
  cursorStyle: 'line' | 'block' | 'underline' = 'line';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all' = 'selection';
  bracketPairColorization = { enabled: true };
  suggestOnTriggerCharacters = true;
  quickSuggestions = { other: true, comments: false, strings: false };
  enableUndoRedo = true;
  undoStackSize = 100;

  update(partial: Partial<EditorPreferences>): void {
    Object.assign(this, partial);
  }
}
