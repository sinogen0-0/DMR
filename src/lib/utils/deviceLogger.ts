export type DeviceLogLevel = 'info' | 'warn' | 'error';

export interface DeviceLogEntry {
  timestamp: number;
  source: string;
  level: DeviceLogLevel;
  message: string;
  meta?: unknown;
}

const EVENT_NAME = 'dmr-device-log';
const MAX_LOGS = 200;

function getGlobalLogs(): DeviceLogEntry[] {
  if (typeof window === 'undefined') return [];

  const existing = (window as any).__DMR_DEVICE_LOGS;
  if (Array.isArray(existing)) {
    return existing as DeviceLogEntry[];
  }

  (window as any).__DMR_DEVICE_LOGS = [] as DeviceLogEntry[];
  return (window as any).__DMR_DEVICE_LOGS;
}

export function logDevice(
  source: string,
  message: string,
  meta?: unknown,
  level: DeviceLogLevel = 'info'
): void {
  const entry: DeviceLogEntry = {
    timestamp: Date.now(),
    source,
    level,
    message,
    meta,
  };

  if (typeof window !== 'undefined') {
    const logs = getGlobalLogs();
    logs.push(entry);
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }

    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: entry }));
  }

  if (level === 'error') {
    console.error(`[${source}] ${message}`, meta ?? '');
  } else if (level === 'warn') {
    console.warn(`[${source}] ${message}`, meta ?? '');
  } else {
    console.log(`[${source}] ${message}`, meta ?? '');
  }
}

export function getDeviceLogs(): DeviceLogEntry[] {
  return [...getGlobalLogs()];
}

export function clearDeviceLogs(): void {
  if (typeof window === 'undefined') return;
  (window as any).__DMR_DEVICE_LOGS = [];
}

export const DEVICE_LOG_EVENT_NAME = EVENT_NAME;
