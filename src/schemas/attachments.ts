import { z } from "zod";

export const ATTACHMENT_BUCKET = "lyfe-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 60;

export const attachmentTarget = z.enum(["tasks", "pets", "vehicles"]);
export const attachmentMimeType = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const attachmentRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  entity_type: z.string(),
  entity_id: z.uuid(),
  storage_path: z.string().min(1),
  mime_type: attachmentMimeType,
  size_bytes: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
});

export type Attachment = z.infer<typeof attachmentRow>;
export type AttachmentTarget = z.infer<typeof attachmentTarget>;
export type AttachmentMimeType = z.infer<typeof attachmentMimeType>;

export function validateAttachmentBytes(
  bytes: ArrayBuffer,
  mimeType: AttachmentMimeType,
) {
  if (!(bytes instanceof ArrayBuffer))
    throw new Error("Invalid attachment data");
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_ATTACHMENT_BYTES)
    throw new Error("Attachment size must be between 1 byte and 10 MiB");
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12));
  const matches =
    (mimeType === "image/jpeg" &&
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff) ||
    (mimeType === "image/png" &&
      header.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (value, index) => header[index] === value,
      )) ||
    (mimeType === "image/webp" &&
      header.length >= 12 &&
      [82, 73, 70, 70].every((value, index) => header[index] === value) &&
      [87, 69, 66, 80].every((value, index) => header[index + 8] === value)) ||
    (mimeType === "application/pdf" &&
      header.length >= 5 &&
      [37, 80, 68, 70, 45].every((value, index) => header[index] === value));
  if (!matches) throw new Error("Attachment content does not match its type");
}
