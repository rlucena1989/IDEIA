export type DialogType = 'open' | 'save' | 'folder' | 'multi'
export interface FileDialogOptions { type: DialogType; filters: FileFilter[]; defaultPath?: string; title?: string; multiSelect?: boolean }
export interface FileFilter { name: string; extensions: string[] }
export interface DialogResult { canceled: boolean; files: string[]; filePath?: string }
export interface FilePreview { path: string; name: string; size: number; type: string; lastModified: string; content?: string }
