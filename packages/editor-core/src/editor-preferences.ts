import { EditorPreferences } from './types';

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
  formatOnSave = true;
  formatOnPaste = false;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid' = 'blink';
  cursorStyle: 'line' | 'block' | 'underline' = 'line';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all' = 'selection';
  bracketPairColorization = { enabled: true };
  suggestOnTriggerCharacters = true;
  quickSuggestions = { other: true, comments: false, strings: false };

  update(partial: Partial<EditorPreferences>): void {
    Object.assign(this, partial);
  }
}
