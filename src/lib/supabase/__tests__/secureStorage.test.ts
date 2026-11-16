import * as SecureStore from "expo-secure-store";
import { secureAuthStorage } from "../secureStorage";

jest.mock("expo-secure-store", () => {
  const values = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;
const deleteItem = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  getItem.mockClear();
  setItem.mockClear();
  deleteItem.mockClear();
});

test("stores, replaces, and removes a session larger than one secure value", async () => {
  const first = "a".repeat(3000) + "🔒".repeat(600);
  await secureAuthStorage.setItem("session", first);
  expect(await secureAuthStorage.getItem("session")).toBe(first);
  expect(
    setItem.mock.calls.every(
      ([, value]) => new TextEncoder().encode(value).length <= 1000,
    ),
  ).toBe(true);

  await secureAuthStorage.setItem("session", "next session");
  expect(await secureAuthStorage.getItem("session")).toBe("next session");
  await secureAuthStorage.removeItem("session");
  expect(await secureAuthStorage.getItem("session")).toBeNull();
});

test("keeps the previous session when replacement fails before commit", async () => {
  await secureAuthStorage.setItem("interrupted", "old session");
  setItem.mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(
    secureAuthStorage.setItem("interrupted", "new session"),
  ).rejects.toThrow();
  expect(await secureAuthStorage.getItem("interrupted")).toBe("old session");
  await secureAuthStorage.removeItem("interrupted");
});
