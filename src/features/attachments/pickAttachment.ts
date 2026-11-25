import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  attachmentMimeType,
  MAX_ATTACHMENT_BYTES,
  validateAttachmentBytes,
  type AttachmentMimeType,
} from "@/schemas/attachments";

export type PickedAttachment = {
  bytes: ArrayBuffer;
  mimeType: AttachmentMimeType;
};

export async function pickAttachment(): Promise<PickedAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: attachmentMimeType.options,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error("No file was selected.");
  const suffix = asset.name?.toLowerCase().split(".").pop();
  const inferredType =
    asset.mimeType && asset.mimeType !== "application/octet-stream"
      ? asset.mimeType
      : suffix === "jpg" || suffix === "jpeg"
        ? "image/jpeg"
        : suffix === "png"
          ? "image/png"
          : suffix === "webp"
            ? "image/webp"
            : suffix === "pdf"
              ? "application/pdf"
              : undefined;
  const parsedType = attachmentMimeType.safeParse(inferredType);
  if (!parsedType.success)
    throw new Error("Choose a JPEG, PNG, WebP, or PDF file.");
  if (
    asset.size != null &&
    (asset.size < 1 || asset.size > MAX_ATTACHMENT_BYTES)
  )
    throw new Error("File must be between 1 byte and 10 MiB.");
  const file = new File(asset.uri);
  if (!file.exists) throw new Error("Selected file is unavailable.");
  if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES)
    throw new Error("File must be between 1 byte and 10 MiB.");
  const bytes = await file.arrayBuffer();
  validateAttachmentBytes(bytes, parsedType.data);
  return { bytes, mimeType: parsedType.data };
}
