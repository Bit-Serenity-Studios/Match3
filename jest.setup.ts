/**
 * Jest bootstrap: mock @react-native-async-storage/async-storage with an
 * in-memory shim so Zustand persist middleware doesn't reach for
 * `window.localStorage` under Node.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        store.delete(k);
        return Promise.resolve();
      },
      clear: () => {
        store.clear();
        return Promise.resolve();
      },
      getAllKeys: () => Promise.resolve(Array.from(store.keys())),
    },
  };
});
