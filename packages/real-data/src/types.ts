export type DataSource = 'csv'|'json'|'api'|'database'|'file';
export interface Dataset { name: string; source: DataSource; records: number; schema: Record<string,string>; path?: string; }
export interface SeedConfig { entity: string; count: number; locale?: string; fields: Record<string,{type:string;options?:string[];min?:number;max?:number}>; }
export interface DataPipeline { name: string; source: string; transforms: string[]; destination: string; schedule?: string; }
