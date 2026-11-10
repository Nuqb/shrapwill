import { call } from './client';

export type InstallationMode = 'portable' | 'installed' | 'manual';
export type UpdateInfo = { version: string; notes: string; bytes: number };
export type UpdateCheck = {
  currentVersion: string;
  mode: InstallationMode;
  feedAvailable: boolean;
  available: UpdateInfo | null;
};
export type UpdateProgress = { version: string; downloaded: number; total: number };
export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'installed'
  | 'current'
  | 'unpublished'
  | 'error';
export type AppUpdateState = {
  phase: UpdatePhase;
  mode: InstallationMode;
  info: UpdateInfo | null;
  error: string;
  downloaded: number;
  total: number;
};
export interface UpdateBackend {
  check(): Promise<UpdateCheck>;
  download(): Promise<void>;
  install(discardUnsaved: boolean): Promise<InstallationMode>;
  restart(discardUnsaved: boolean): Promise<void>;
  cancel(): Promise<void>;
}
export class AppUpdateService {
  private state: AppUpdateState = {
    phase: 'idle',
    mode: 'manual',
    info: null,
    error: '',
    downloaded: 0,
    total: 0,
  };
  private listeners = new Set<(state: AppUpdateState) => void>();
  private startupChecked = false;
  private checking?: Promise<void>;
  constructor(private backend: UpdateBackend) {}
  snapshot = () => this.state;
  subscribe = (listener: (state: AppUpdateState) => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(patch: Partial<AppUpdateState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }
  check(startup = false): Promise<void> {
    if (this.checking) return this.checking;
    if (['downloading', 'ready', 'installing', 'installed'].includes(this.state.phase))
      return Promise.resolve();
    if (startup && this.startupChecked) return Promise.resolve();
    this.startupChecked = true;
    this.set({ phase: 'checking', error: '' });
    this.checking = this.backend
      .check()
      .then((result) => {
        this.set({
          mode: result.mode,
          info: result.available,
          downloaded: 0,
          total: result.available?.bytes ?? 0,
          phase: result.available ? 'available' : result.feedAvailable ? 'current' : 'unpublished',
        });
      })
      .catch((error) => {
        this.set({ phase: 'error', error: String(error) });
      })
      .finally(() => {
        this.checking = undefined;
      });
    return this.checking;
  }
  progress(progress: UpdateProgress) {
    if (this.state.phase === 'downloading' && this.state.info?.version === progress.version)
      this.set({ downloaded: progress.downloaded, total: progress.total });
  }
  async download() {
    if (
      !this.state.info ||
      this.state.mode === 'manual' ||
      !(
        ['available', 'error'].includes(this.state.phase) ||
        (this.state.phase === 'ready' && this.state.error)
      )
    )
      return;
    this.set({ phase: 'downloading', downloaded: 0, error: '' });
    try {
      await this.backend.download();
      this.set({ phase: 'ready' });
    } catch (error) {
      this.set({ phase: 'error', error: String(error) });
    }
  }
  async install(discardUnsaved = false) {
    if (this.state.phase !== 'ready') return;
    this.set({ phase: 'installing', error: '' });
    try {
      await this.backend.install(discardUnsaved);
      this.set({ phase: 'installed' });
    } catch (error) {
      this.set({ phase: 'ready', error: String(error) });
    }
  }
  async restart(discardUnsaved = false) {
    if (this.state.phase !== 'installed') return;
    this.set({ phase: 'installing', error: '' });
    try {
      await this.backend.restart(discardUnsaved);
    } catch (error) {
      this.set({ phase: 'installed', error: String(error) });
    }
  }
  async cancel() {
    try {
      await this.backend.cancel();
    } catch (error) {
      this.set({ error: String(error) });
    }
  }
}
export const appUpdates = new AppUpdateService({
  check: () => call<UpdateCheck>('check_for_updates'),
  download: () => call('download_app_update'),
  install: (discardUnsaved) => call<InstallationMode>('install_app_update', { discardUnsaved }),
  restart: (discardUnsaved) => call('restart_for_update', { discardUnsaved }),
  cancel: () => call('cancel_app_update'),
});
