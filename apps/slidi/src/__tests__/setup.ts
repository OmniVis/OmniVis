import "fake-indexeddb/auto";

/**
 * Global test setup — runs before each test file.
 * Polyfills localStorage and window so the Zustand store's
 * loadFromStorage() sees a browser-like environment in Node.
 */

const _store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string): string | null => _store[key] ?? null,
  setItem: (key: string, value: string): void => {
    _store[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete _store[key];
  },
  clear: (): void => {
    Object.keys(_store).forEach((k) => delete _store[k]);
  },
  get length(): number {
    return Object.keys(_store).length;
  },
  key: (_index: number): string | null => null,
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Make `typeof window !== "undefined"` true so loadFromStorage() runs
if (typeof (global as Record<string, unknown>).window === "undefined") {
  (global as Record<string, unknown>).window = global;
}
