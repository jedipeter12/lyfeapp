import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_ATTACHMENT_BYTES,
  SIGNED_URL_SECONDS,
  validateAttachmentBytes,
} from "@/schemas/attachments";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import {
  AttachmentCleanupError,
  createAttachmentService,
} from "../attachments";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const entityId = "33333333-3333-4333-8333-333333333333";
const attachmentId = "44444444-4444-4444-8444-444444444444";
const path = `${userId}/${attachmentId}`;
const pdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer;
const row = {
  id: attachmentId,
  user_id: userId,
  entity_type: "pets",
  entity_id: entityId,
  storage_path: path,
  mime_type: "application/pdf",
  size_bytes: pdf.byteLength,
};
const online = async () => ({
  isConnected: true,
  isInternetReachable: true,
});

function fakeClient() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  const bucket = {
    upload: jest.fn().mockResolvedValue({ error: null }),
    remove: jest.fn().mockResolvedValue({ error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: "https://example.invalid/signed" },
      error: null,
    }),
  };
  const from = jest.fn().mockReturnValue(chain);
  const storageFrom = jest.fn().mockReturnValue(bucket);
  const client = {
    from,
    storage: { from: storageFrom },
  } as unknown as SupabaseClient;
  return { client, chain, bucket, from, storageFrom };
}

function service(client: SupabaseClient) {
  return createAttachmentService(client, online, () => attachmentId);
}

describe("attachment validation", () => {
  it("accepts recognized signatures and rejects a forged type", () => {
    expect(() => validateAttachmentBytes(pdf, "application/pdf")).not.toThrow();
    expect(() =>
      validateAttachmentBytes(
        new Uint8Array([255, 216, 255, 0]).buffer,
        "image/jpeg",
      ),
    ).not.toThrow();
    expect(() =>
      validateAttachmentBytes(
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer,
        "image/png",
      ),
    ).not.toThrow();
    expect(() =>
      validateAttachmentBytes(
        new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]).buffer,
        "image/webp",
      ),
    ).not.toThrow();
    expect(() => validateAttachmentBytes(pdf, "image/png")).toThrow(
      "does not match",
    );
    expect(() =>
      validateAttachmentBytes(new ArrayBuffer(0), "application/pdf"),
    ).toThrow("size");
    expect(() =>
      validateAttachmentBytes(
        new ArrayBuffer(MAX_ATTACHMENT_BYTES + 1),
        "application/pdf",
      ),
    ).toThrow("size");
  });
});

describe("attachment service", () => {
  it("checks an owned target before uploading and writes exact metadata", async () => {
    const { client, chain, bucket, from } = fakeClient();
    chain.single
      .mockResolvedValueOnce({
        data: { id: entityId, user_id: userId },
        error: null,
      })
      .mockResolvedValueOnce({ data: row, error: null });
    await expect(
      service(client).upload(userId, "pets", entityId, pdf, "application/pdf"),
    ).resolves.toEqual(row);
    expect(from).toHaveBeenNthCalledWith(1, "pets");
    expect(from).toHaveBeenNthCalledWith(2, "attachments");
    expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(bucket.upload).toHaveBeenCalledWith(path, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });
    expect(chain.insert).toHaveBeenCalledWith({
      id: attachmentId,
      user_id: userId,
      entity_type: "pets",
      entity_id: entityId,
      storage_path: path,
      mime_type: "application/pdf",
      size_bytes: pdf.byteLength,
    });
  });

  it("does not upload when the target is foreign or the bytes are invalid", async () => {
    const { client, chain, bucket, from } = fakeClient();
    chain.single.mockResolvedValue({
      data: { id: entityId, user_id: otherUserId },
      error: null,
    });
    await expect(
      service(client).upload(userId, "pets", entityId, pdf, "application/pdf"),
    ).rejects.toThrow("target is unavailable");
    await expect(
      service(client).upload(userId, "pets", entityId, pdf, "image/png"),
    ).rejects.toThrow("does not match");
    expect(bucket.upload).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("removes a file when its metadata insert fails", async () => {
    const { client, chain, bucket } = fakeClient();
    const writeError = new Error("metadata unavailable");
    chain.single
      .mockResolvedValueOnce({
        data: { id: entityId, user_id: userId },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: writeError });
    await expect(
      service(client).upload(userId, "pets", entityId, pdf, "application/pdf"),
    ).rejects.toBe(writeError);
    expect(bucket.remove).toHaveBeenCalledWith([path]);
  });

  it("reports an upload cleanup failure without claiming success", async () => {
    const { client, chain, bucket } = fakeClient();
    chain.single
      .mockResolvedValueOnce({
        data: { id: entityId, user_id: userId },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("insert failed") });
    bucket.remove.mockResolvedValue({ error: new Error("remove failed") });
    await expect(
      service(client).upload(userId, "pets", entityId, pdf, "application/pdf"),
    ).rejects.toBeInstanceOf(AttachmentCleanupError);
  });

  it("reports cleanup failure when Storage rejects the cleanup request", async () => {
    const { client, chain, bucket } = fakeClient();
    chain.single
      .mockResolvedValueOnce({
        data: { id: entityId, user_id: userId },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("insert failed") });
    bucket.remove.mockRejectedValue(new Error("network failed"));
    await expect(
      service(client).upload(userId, "pets", entityId, pdf, "application/pdf"),
    ).rejects.toBeInstanceOf(AttachmentCleanupError);
  });

  it("lists owned metadata and issues a fresh 60-second signed link", async () => {
    const { client, chain, bucket } = fakeClient();
    chain.range.mockResolvedValue({ data: [row], error: null });
    chain.single.mockResolvedValue({ data: row, error: null });
    const attachments = service(client);
    await expect(attachments.list(userId, "pets", entityId)).resolves.toEqual([
      row,
    ]);
    await expect(attachments.signedUrl(userId, attachmentId)).resolves.toBe(
      "https://example.invalid/signed",
    );
    await expect(attachments.signedUrl(userId, attachmentId)).resolves.toBe(
      "https://example.invalid/signed",
    );
    expect(bucket.createSignedUrl).toHaveBeenCalledWith(
      path,
      SIGNED_URL_SECONDS,
    );
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(2);
    expect(row).not.toHaveProperty("signedUrl");
  });

  it("rejects a foreign or malformed metadata path before signing", async () => {
    const { client, chain, bucket } = fakeClient();
    chain.single.mockResolvedValue({
      data: { ...row, storage_path: `${otherUserId}/${attachmentId}` },
      error: null,
    });
    await expect(
      service(client).signedUrl(userId, attachmentId),
    ).rejects.toThrow("owner or path");
    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });

  it("removes the private file before its metadata row", async () => {
    const { client, chain, bucket } = fakeClient();
    chain.single
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: { id: attachmentId }, error: null });
    await expect(service(client).delete(userId, attachmentId)).resolves.toEqual(
      row,
    );
    expect(bucket.remove).toHaveBeenCalledWith([path]);
    expect(chain.delete).toHaveBeenCalledTimes(1);
    expect(bucket.remove.mock.invocationCallOrder[0]).toBeLessThan(
      chain.delete.mock.invocationCallOrder[0],
    );
  });

  it("reports a partial deletion when metadata remains", async () => {
    const { client, chain, bucket } = fakeClient();
    chain.single
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("delete failed") });
    await expect(
      service(client).delete(userId, attachmentId),
    ).rejects.toBeInstanceOf(AttachmentCleanupError);
    expect(bucket.remove).toHaveBeenCalledWith([path]);
  });

  it("rejects offline writes before contacting Supabase", async () => {
    const { client, from, bucket } = fakeClient();
    const attachments = createAttachmentService(
      client,
      async () => ({ isConnected: false, isInternetReachable: false }),
      () => attachmentId,
    );
    await expect(
      attachments.upload(userId, "pets", entityId, pdf, "application/pdf"),
    ).rejects.toBeInstanceOf(OfflineWriteError);
    await expect(
      attachments.delete(userId, attachmentId),
    ).rejects.toBeInstanceOf(OfflineWriteError);
    expect(from).not.toHaveBeenCalled();
    expect(bucket.upload).not.toHaveBeenCalled();
  });
});
