export type AppType = 'api'|'web'|'cli'|'library'|'mobile'|'desktop';
export type TemplateEngine = 'handlebars'|'ejs'|'mustache';
export interface AppBlueprint { name: string; type: AppType; language: string; framework: string; features: string[]; }
export interface ScaffoldFile { path: string; content: string; template: boolean; }
export interface PrototypeResult { name: string; files: number; duration: number; blueprint: AppBlueprint; }
