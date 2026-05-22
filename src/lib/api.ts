import type { IpcChannel, IpcResponse } from '@/types/ipc';

export async function api<T>(channel: IpcChannel, ...args: unknown[]): Promise<T> {
  const res: IpcResponse<T> = await window.api.invoke(channel, ...args);
  if (!res.success) throw new Error(res.error ?? 'Request failed');
  return res.data as T;
}
