const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = "__chunks";

export interface KeyValueDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const memoryFallback = new Map<string, string>();

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getWebLocalStorage(): WebStorageLike | null {
  const host = globalThis as unknown as { localStorage?: WebStorageLike };
  if (
    host?.localStorage &&
    typeof host.localStorage.getItem === "function" &&
    typeof host.localStorage.setItem === "function" &&
    typeof host.localStorage.removeItem === "function"
  ) {
    return host.localStorage;
  }
  return null;
}

async function loadExpoSecureStoreDriver(): Promise<KeyValueDriver> {
  const webStorage = getWebLocalStorage();
  if (webStorage) {
    return {
      getItem: async (k) => webStorage.getItem(k),
      setItem: async (k, v) => {
        webStorage.setItem(k, v);
      },
      removeItem: async (k) => {
        webStorage.removeItem(k);
      },
    };
  }

  try {
    const SecureStore = await import("expo-secure-store");
    const available =
      typeof SecureStore.isAvailableAsync !== "function" ||
      (await SecureStore.isAvailableAsync());
    if (
      available &&
      typeof SecureStore.getItemAsync === "function" &&
      typeof SecureStore.setItemAsync === "function" &&
      typeof SecureStore.deleteItemAsync === "function"
    ) {
      return {
        getItem: (k) => SecureStore.getItemAsync(k),
        setItem: (k, v) => SecureStore.setItemAsync(k, v),
        removeItem: (k) => SecureStore.deleteItemAsync(k),
      };
    }
  } catch {
    // Non-native test runner falls back to memory driver unless explicitly injected.
  }

  return {
    getItem: async (k) => memoryFallback.get(k) ?? null,
    setItem: async (k, v) => {
      memoryFallback.set(k, v);
    },
    removeItem: async (k) => {
      memoryFallback.delete(k);
    },
  };
}

/**
 * Creates a chunked SecureStore adapter compatible with Supabase's `SupportedStorage`
 * so large OAuth/JWT session payloads safely fit under iOS/Android 2KB key limits.
 */
export function createChunkedSecureStorage(customDriver?: KeyValueDriver) {
  let driverPromise: Promise<KeyValueDriver> | null = customDriver
    ? Promise.resolve(customDriver)
    : null;

  const getDriver = () => {
    if (!driverPromise) {
      driverPromise = loadExpoSecureStoreDriver();
    }
    return driverPromise;
  };

  const deleteChunks = async (driver: KeyValueDriver, key: string) => {
    const countRaw = await driver.getItem(`${key}${CHUNK_COUNT_SUFFIX}`);
    const count = countRaw ? Number.parseInt(countRaw, 10) : 0;
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        await driver.removeItem(`${key}__chunk_${i}`);
      }
    }
    await driver.removeItem(`${key}${CHUNK_COUNT_SUFFIX}`);
  };

  return {
    async getItem(key: string): Promise<string | null> {
      const driver = await getDriver();
      const countRaw = await driver.getItem(`${key}${CHUNK_COUNT_SUFFIX}`);
      if (!countRaw) {
        return driver.getItem(key);
      }

      const count = Number.parseInt(countRaw, 10);
      if (!Number.isFinite(count) || count <= 0) {
        return null;
      }

      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await driver.getItem(`${key}__chunk_${i}`);
        if (part === null) {
          return null;
        }
        parts.push(part);
      }
      return parts.join("");
    },

    async setItem(key: string, value: string): Promise<void> {
      const driver = await getDriver();
      await deleteChunks(driver, key);

      if (value.length <= CHUNK_SIZE) {
        await driver.setItem(key, value);
        return;
      }

      await driver.removeItem(key);
      const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await driver.setItem(`${key}__chunk_${i}`, slice);
      }
      await driver.setItem(`${key}${CHUNK_COUNT_SUFFIX}`, String(totalChunks));
    },

    async removeItem(key: string): Promise<void> {
      const driver = await getDriver();
      await deleteChunks(driver, key);
      await driver.removeItem(key);
    },
  };
}

export const chunkedSecureStorage = createChunkedSecureStorage();
