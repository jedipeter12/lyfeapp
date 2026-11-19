import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  Attachment,
  AttachmentMimeType,
  AttachmentTarget,
} from "@/schemas/attachments";
import { attachmentService } from "@/services/storage/attachments";

function requiredAttachmentService() {
  if (!attachmentService) throw new Error("Supabase is not configured");
  return attachmentService;
}

export const attachmentKeys = {
  entity: (userId: string, target: AttachmentTarget, entityId: string) =>
    ["user", userId, "attachments", target, entityId] as const,
  list: (
    userId: string,
    target: AttachmentTarget,
    entityId: string,
    page: number,
  ) => [...attachmentKeys.entity(userId, target, entityId), page] as const,
};

export function invalidateAttachmentQueries(
  client: QueryClient,
  userId: string,
  attachment: Pick<Attachment, "entity_type" | "entity_id">,
) {
  return client.invalidateQueries({
    queryKey: [
      "user",
      userId,
      "attachments",
      attachment.entity_type,
      attachment.entity_id,
    ],
  });
}

export function useAttachmentList(
  target: AttachmentTarget,
  userId?: string,
  entityId?: string,
  page = 0,
) {
  return useQuery({
    queryKey: attachmentKeys.list(userId ?? "", target, entityId ?? "", page),
    queryFn: () =>
      requiredAttachmentService().list(userId!, target, entityId!, page),
    enabled: Boolean(userId && entityId && attachmentService),
  });
}

export function useUploadAttachment(
  userId: string,
  target: AttachmentTarget,
  entityId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      bytes,
      mimeType,
    }: {
      bytes: ArrayBuffer;
      mimeType: AttachmentMimeType;
    }) =>
      requiredAttachmentService().upload(
        userId,
        target,
        entityId,
        bytes,
        mimeType,
      ),
    onSuccess: (attachment) =>
      invalidateAttachmentQueries(client, userId, attachment),
  });
}

export function useDeleteAttachment(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      requiredAttachmentService().delete(userId, attachmentId),
    onSuccess: (attachment) =>
      invalidateAttachmentQueries(client, userId, attachment),
  });
}
