import { writable, get } from 'svelte/store';
import type { AppSettings } from '$lib/types';

const STORAGE_KEY = 'dmr_app_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  audioCodec: 'flac',
  mergeThreshold: 90,
  referenceLinkStyle: 'modal',
  language: 'en-US',
  theme: 'light'
};

function loadStoredSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persist(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const _settings = writable<AppSettings>(DEFAULT_SETTINGS);
let _initialized = false;

export const appSettings = {
  subscribe: _settings.subscribe
};

export function initializeSettingsStore(): void {
  if (_initialized) return;
  _settings.set(loadStoredSettings());
  _initialized = true;
}

export function updateSettings(changes: Partial<AppSettings>): AppSettings {
  const next = {
    ...get(_settings),
    ...changes
  };
  _settings.set(next);
  persist(next);
  return next;
}

export function resetSettings(): AppSettings {
  _settings.set(DEFAULT_SETTINGS);
  persist(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
