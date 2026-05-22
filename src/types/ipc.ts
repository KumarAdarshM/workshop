import { IPC } from '../../electron/ipc/channels';

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IpcApi {
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) => Promise<IpcResponse<T>>;
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
}

export interface User {
  id: string;
  name: string;
  email?: string | null;
  role: 'ADMIN' | 'STAFF' | 'MECHANIC';
  phone?: string | null;
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
