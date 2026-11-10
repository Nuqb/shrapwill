import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { call, events } from './client';
import type { Snapshot, Job } from '../../types';

export interface StartupData {
  snapshot: Snapshot;
  recents: { name: string; path: string }[];
  recovery: boolean;
  encoders: string[];
  version: string;
}

export interface DesktopCallbacks {
  startup: (data: StartupData) => void;
  startupFailed: (error: unknown) => void;
  project: (snapshot: Snapshot) => void;
  job: (job: Job) => void;
  encoders: (encoders: string[]) => void;
  close: () => Promise<void>;
  drop: (paths: string[]) => void;
  failed: (error: unknown) => void;
}

function subscriptionLifetime() {
  let active = true;
  const subscriptions: (() => void)[] = [];
  return {
    active: () => active,
    add: (unsubscribe: () => void) => (active ? subscriptions.push(unsubscribe) : unsubscribe()),
    dispose: () => {
      active = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    },
  };
}
type Lifetime = ReturnType<typeof subscriptionLifetime>;

async function listenActive<T>(life: Lifetime, name: string, handler: (payload: T) => void) {
  const unsubscribe = await events<T>(name, (event) => {
    if (life.active()) handler(event.payload);
  });
  life.add(unsubscribe);
}

async function initialize(callbacks: DesktopCallbacks, life: Lifetime) {
  try {
    const data = await call<StartupData>('startup');
    if (life.active()) callbacks.startup(data);
  } catch (error) {
    if (life.active()) callbacks.startupFailed(error);
  }
}

async function register(callbacks: DesktopCallbacks, life: Lifetime) {
  await Promise.all([
    listenActive(life, 'editor-changed', callbacks.project),
    listenActive(life, 'job', callbacks.job),
    listenActive(life, 'encoders', callbacks.encoders),
    listenActive(life, 'close-requested', () => void callbacks.close().catch(callbacks.failed)),
  ]);
  const unsubscribe = await getCurrentWebviewWindow().onDragDropEvent((event) => {
    if (life.active() && event.payload.type === 'drop') callbacks.drop(event.payload.paths);
  });
  life.add(unsubscribe);
}

export function subscribeDesktop(callbacks: DesktopCallbacks) {
  const life = subscriptionLifetime();
  void initialize(callbacks, life);
  void register(callbacks, life).catch((error) => {
    if (life.active()) callbacks.failed(error);
  });
  return life.dispose;
}
