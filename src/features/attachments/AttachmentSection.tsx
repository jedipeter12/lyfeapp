import { useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { FeedbackState } from "@/components/ui/FeedbackState";
import {
  useAttachmentList,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/lib/query/attachments";
import type { Attachment, AttachmentTarget } from "@/schemas/attachments";
import {
  AttachmentCleanupError,
  attachmentService,
} from "@/services/storage/attachments";
import { spacing, useAppTheme } from "@/theme";
import { pickAttachment } from "./pickAttachment";

type Props = {
  target: AttachmentTarget;
  userId: string;
  entityId: string;
};

const typeName: Record<Attachment["mime_type"], string> = {
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/webp": "WebP image",
  "application/pdf": "PDF",
};

export function AttachmentSection({ target, userId, entityId }: Props) {
  const { colors } = useAppTheme();
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const list = useAttachmentList(target, userId, entityId, page);
  const upload = useUploadAttachment(userId, target, entityId);
  const remove = useDeleteAttachment(userId);

  async function add() {
    if (busyId || !userId) return;
    setBusyId("upload");
    setMessage("");
    try {
      const picked = await pickAttachment();
      if (!picked) return;
      await upload.mutateAsync(picked);
      setPage(0);
      setMessage("Attachment uploaded.");
    } catch (error) {
      setMessage(
        error instanceof AttachmentCleanupError
          ? error.message
          : error instanceof Error &&
              (error.message.startsWith("Choose a") ||
                error.message.startsWith("File must") ||
                error.message.startsWith("Attachment size") ||
                error.message.startsWith("Attachment content") ||
                error.message === "Selected file is unavailable.")
            ? error.message
            : "Could not upload attachment. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function open(attachment: Attachment) {
    if (busyId || !userId) return;
    setBusyId(attachment.id);
    setMessage("");
    try {
      if (!attachmentService) throw new Error("Supabase is not configured");
      const url = await attachmentService.signedUrl(userId, attachment.id);
      await Linking.openURL(url);
    } catch {
      setMessage("Could not open attachment. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(attachment: Attachment) {
    if (busyId || !userId) return;
    Alert.alert(
      "Delete attachment?",
      `This ${typeName[attachment.mime_type]} will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteAttachment(attachment),
        },
      ],
    );
  }

  async function deleteAttachment(attachment: Attachment) {
    if (busyId) return;
    setBusyId(attachment.id);
    setMessage("");
    try {
      await remove.mutateAsync(attachment.id);
      setMessage("Attachment deleted.");
    } catch (error) {
      setMessage(
        error instanceof AttachmentCleanupError
          ? error.message
          : "Could not delete attachment. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: colors.text }]}
      >
        Attachments
      </Text>
      <Text style={{ color: colors.muted }}>
        JPEG, PNG, WebP, or PDF · 10 MiB maximum
      </Text>
      <AppButton
        onPress={() => void add()}
        busy={busyId === "upload"}
        disabled={Boolean(busyId) || !userId}
      >
        Add attachment
      </AppButton>
      {list.isPending ? (
        <FeedbackState kind="loading" title="Loading attachments…" />
      ) : list.isError ? (
        <FeedbackState
          kind="error"
          title="Could not load attachments"
          actionLabel="Try again"
          onAction={() => void list.refetch()}
        />
      ) : list.data?.length ? (
        list.data.map((attachment, index) => (
          <View key={attachment.id} style={styles.item}>
            <Text style={{ color: colors.text }}>
              {typeName[attachment.mime_type]} {page * 100 + index + 1} ·{" "}
              {Math.ceil(attachment.size_bytes / 1024)} KiB
            </Text>
            <AppButton
              variant="secondary"
              onPress={() => void open(attachment)}
              busy={busyId === attachment.id}
              disabled={Boolean(busyId)}
            >
              Open attachment {page * 100 + index + 1}
            </AppButton>
            <AppButton
              variant="secondary"
              onPress={() => confirmDelete(attachment)}
              disabled={Boolean(busyId)}
            >
              Delete attachment {page * 100 + index + 1}
            </AppButton>
          </View>
        ))
      ) : (
        <FeedbackState
          kind="empty"
          title={page ? "No more attachments" : "No attachments yet"}
        />
      )}
      <View style={styles.paging}>
        {page > 0 ? (
          <AppButton variant="secondary" onPress={() => setPage(page - 1)}>
            Previous attachments
          </AppButton>
        ) : null}
        {list.data?.length === 100 ? (
          <AppButton variant="secondary" onPress={() => setPage(page + 1)}>
            More attachments
          </AppButton>
        ) : null}
      </View>
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { fontSize: 22, fontWeight: "700" },
  item: { gap: spacing.sm },
  paging: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
