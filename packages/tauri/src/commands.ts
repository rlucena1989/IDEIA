import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '@ideia/logger';
import type { IdeServerState, SystemInfo} from './types';
const logger = createLogger('commands');

export async function startIdeServer(): Promise<IdeServerState> {
  return invoke<IdeServerState>('start_ide_server');
}

export async function stopIdeServer(): Promise<IdeServerState> {
  return invoke<IdeServerState>('stop_ide_server');
}

export async function ideServerStatus(): Promise<IdeServerState> {
  return invoke<IdeServerState>('ide_server_status');
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke<SystemInfo>('get_system_info');
}

export async function openExternal(url: string): Promise<void> {
  return invoke<void>('open_external', { url });
}

export async function showInFolder(path: string): Promise<void> {
  return invoke<void>('show_in_folder', { path });
}
