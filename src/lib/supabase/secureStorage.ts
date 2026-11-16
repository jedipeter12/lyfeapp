import * as SecureStore from "expo-secure-store";

// Each SecureStore value stays below the platform's 2048-byte guidance.
// Two slots keep the old session intact until all new chunks have been written.
const CHUNK_SIZE = 1000;
type Manifest = { slot: 0 | 1; count: number };

function splitIntoChunks(value: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    const size =
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;
    if (bytes + size > CHUNK_SIZE) {
      chunks.push(chunk);
      chunk = "";
      bytes = 0;
    }
    chunk += character;
    bytes += size;
  }
  chunks.push(chunk);
  return chunks;
}

function manifestKey(key: string) {
  return `${key}.manifest`;
}

function chunkKey(key: string, slot: 0 | 1, index: number) {
  return `${key}.${slot}.${index}`;
}

async function readManifest(key: string): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(manifestKey(key));
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "slot" in value &&
      (value.slot === 0 || value.slot === 1) &&
      "count" in value &&
      typeof value.count === "number" &&
      Number.isInteger(value.count) &&
      value.count >= 1 &&
      value.count <= 100
    ) {
      return value as Manifest;
    }
  } catch {
    // Treat a damaged manifest as a missing session.
  }
  return null;
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const manifest = await readManifest(key);
    if (!manifest) return null;
    const chunks: string[] = [];
    for (let i = 0; i < manifest.count; i += 1) {
      const chunk = await SecureStore.getItemAsync(
        chunkKey(key, manifest.slot, i),
      );
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    const old = await readManifest(key);
    const slot: 0 | 1 = old?.slot === 0 ? 1 : 0;
    const chunks = splitIntoChunks(value);
    if (chunks.length > 100)
      throw new Error("Auth session exceeds secure storage limit");
    let written = 0;
    try {
      for (let i = 0; i < chunks.length; i += 1) {
        await SecureStore.setItemAsync(chunkKey(key, slot, i), chunks[i]);
        written += 1;
      }
      await SecureStore.setItemAsync(
        manifestKey(key),
        JSON.stringify({ slot, count: chunks.length }),
      );
    } catch (error) {
      for (let i = 0; i < written; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, slot, i));
      }
      throw error;
    }
    if (old) {
      for (let i = 0; i < old.count; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, old.slot, i));
      }
    }
  },
  async removeItem(key: string): Promise<void> {
    const manifest = await readManifest(key);
    await SecureStore.deleteItemAsync(manifestKey(key));
    if (manifest) {
      for (let i = 0; i < manifest.count; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, manifest.slot, i));
      }
    }
  },
};
