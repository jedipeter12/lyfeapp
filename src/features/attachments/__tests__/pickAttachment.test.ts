import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { MAX_ATTACHMENT_BYTES } from "@/schemas/attachments";
import { pickAttachment } from "../pickAttachment";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));

const picker = DocumentPicker.getDocumentAsync as jest.Mock;
const file = File as unknown as jest.Mock;
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;

beforeEach(() => {
  picker.mockReset();
  file.mockReset().mockImplementation(() => ({
    exists: true,
    size: png.byteLength,
    arrayBuffer: async () => png,
  }));
});

it("returns selected supported bytes and requests a readable cache copy", async () => {
  picker.mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///safe", mimeType: "image/png", size: png.byteLength },
    ],
  });
  await expect(pickAttachment()).resolves.toEqual({
    bytes: png,
    mimeType: "image/png",
  });
  expect(picker).toHaveBeenCalledWith({
    type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  expect(file).toHaveBeenCalledWith("file:///safe");
});

it("accepts a supported extension when the picker omits MIME", async () => {
  picker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///safe", name: "PHOTO.PNG", size: png.byteLength }],
  });
  await expect(pickAttachment()).resolves.toEqual({
    bytes: png,
    mimeType: "image/png",
  });
});

it("treats cancellation as no upload", async () => {
  picker.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickAttachment()).resolves.toBeNull();
  expect(file).not.toHaveBeenCalled();
});

it("rejects unsupported, oversized, and mislabeled files before upload", async () => {
  picker.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: "file:///bad", mimeType: "image/gif", size: 10 }],
  });
  await expect(pickAttachment()).rejects.toThrow("Choose a JPEG");
  picker.mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        uri: "file:///large",
        mimeType: "image/png",
        size: MAX_ATTACHMENT_BYTES + 1,
      },
    ],
  });
  await expect(pickAttachment()).rejects.toThrow("10 MiB");
  expect(file).not.toHaveBeenCalled();
  picker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///false.png", mimeType: "image/png" }],
  });
  file.mockImplementation(() => ({
    exists: true,
    size: png.byteLength,
    arrayBuffer: async () =>
      new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer,
  }));
  await expect(pickAttachment()).rejects.toThrow("does not match");
});
