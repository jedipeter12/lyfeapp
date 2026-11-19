import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "expo-crypto";
import { z } from "zod";
import {
  ATTACHMENT_BUCKET,
  SIGNED_URL_SECONDS,
  attachmentMimeType,
  attachmentRow,
  attachmentTarget,
  validateAttachmentBytes,
  type Attachment,
  type AttachmentMimeType,
  type AttachmentTarget,
} from "@/schemas/attachments";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import { supabase } from "@/lib/supabase/client";

type NetworkState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export class AttachmentCleanupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AttachmentCleanupError";
  }
}

function ownedAttachment(value: unknown, userId: string): Attachment {
  const row = attachmentRow.parse(value);
  if (row.user_id !== userId || row.storage_path !== `${userId}/${row.id}`) {
    throw new Error("Unexpected attachment owner or path");
  }
  return row;
}

export function createAttachmentService(
  client: SupabaseClient,
  networkState: () => Promise<NetworkState> = () => NetInfo.fetch(),
  newId: () => string = randomUUID,
) {
  const bucket = client.storage.from(ATTACHMENT_BUCKET);

  async function assertOnline() {
    const state = await networkState();
    if (state.isConnected !== true || state.isInternetReachable === false)
      throw new OfflineWriteError();
  }

  async function getMetadata(userId: string, attachmentId: string) {
    z.uuid().parse(userId);
    z.uuid().parse(attachmentId);
    const { data, error } = await client
      .from("attachments")
      .select("*")
      .eq("user_id", userId)
      .eq("id", attachmentId)
      .single();
    if (error) throw error;
    return ownedAttachment(data, userId);
  }

  return {
    async list(
      userId: string,
      target: AttachmentTarget,
      entityId: string,
      page = 0,
    ): Promise<Attachment[]> {
      z.uuid().parse(userId);
      attachmentTarget.parse(target);
      z.uuid().parse(entityId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      const { data, error } = await client
        .from("attachments")
        .select("*")
        .eq("user_id", userId)
        .eq("entity_type", target)
        .eq("entity_id", entityId)
        .order("id")
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((row) => ownedAttachment(row, userId));
    },

    async upload(
      userId: string,
      target: AttachmentTarget,
      entityId: string,
      bytes: ArrayBuffer,
      mimeType: AttachmentMimeType,
    ): Promise<Attachment> {
      z.uuid().parse(userId);
      attachmentTarget.parse(target);
      z.uuid().parse(entityId);
      attachmentMimeType.parse(mimeType);
      validateAttachmentBytes(bytes, mimeType);
      await assertOnline();

      const { data: targetRow, error: targetError } = await client
        .from(target)
        .select("id,user_id")
        .eq("user_id", userId)
        .eq("id", entityId)
        .single();
      if (targetError) throw targetError;
      if (targetRow?.id !== entityId || targetRow.user_id !== userId)
        throw new Error("Attachment target is unavailable");

      const attachmentId = z.uuid().parse(newId());
      const path = `${userId}/${attachmentId}`;
      const { error: uploadError } = await bucket.upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await client
        .from("attachments")
        .insert({
          id: attachmentId,
          user_id: userId,
          entity_type: target,
          entity_id: entityId,
          storage_path: path,
          mime_type: mimeType,
          size_bytes: bytes.byteLength,
        })
        .select("*")
        .single();
      if (error) {
        try {
          const cleanup = await bucket.remove([path]);
          if (cleanup.error) throw cleanup.error;
        } catch {
          throw new AttachmentCleanupError(
            "Attachment upload failed and the private file could not be removed",
            { cause: error },
          );
        }
        throw error;
      }
      return ownedAttachment(data, userId);
    },

    async signedUrl(userId: string, attachmentId: string) {
      const attachment = await getMetadata(userId, attachmentId);
      const { data, error } = await bucket.createSignedUrl(
        attachment.storage_path,
        SIGNED_URL_SECONDS,
      );
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Attachment link unavailable");
      return data.signedUrl;
    },

    async delete(userId: string, attachmentId: string): Promise<Attachment> {
      await assertOnline();
      const attachment = await getMetadata(userId, attachmentId);
      const removed = await bucket.remove([attachment.storage_path]);
      if (removed.error) throw removed.error;
      const { data, error } = await client
        .from("attachments")
        .delete()
        .eq("user_id", userId)
        .eq("id", attachmentId)
        .select("id")
        .single();
      if (error || data?.id !== attachmentId)
        throw new AttachmentCleanupError(
          "Private file removed but attachment record deletion could not be confirmed; retry or repair it",
          { cause: error },
        );
      return attachment;
    },
  };
}

export const attachmentService = supabase
  ? createAttachmentService(supabase)
  : null;
