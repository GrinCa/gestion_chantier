/**
 * env-guard.ts
 * Runtime guards to fail fast when wrong bundle is used.
 */

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && !!(process.versions as any)?.node;
}

export function ensureBrowserEnvironment() {
  if (!isBrowser()) {
    throw new Error('[core] Browser build imported in a non-browser environment');
  }
}

export function ensureNodeEnvironment() {
  if (!isNode()) {
    throw new Error('[core] Node build imported in a non-node environment');
  }
}
