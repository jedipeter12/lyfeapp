import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { spacing, useAppTheme } from "@/theme";
import { AppButton } from "./AppButton";

type Props = {
  kind: "loading" | "empty" | "error";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function FeedbackState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  const { colors } = useAppTheme();
  const foreground = kind === "error" ? colors.error : colors.text;
  return (
    <View
      accessibilityLiveRegion={kind === "empty" ? "none" : "polite"}
      style={styles.container}
    >
      {kind === "loading" ? (
        <ActivityIndicator
          accessibilityLabel="Loading"
          color={colors.primary}
        />
      ) : null}
      <Text
        accessibilityRole={kind === "error" ? "alert" : "header"}
        style={[styles.title, { color: foreground }]}
      >
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: colors.muted }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton onPress={onAction} variant="secondary">
          {actionLabel}
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, alignItems: "flex-start" },
  title: { fontSize: 20, fontWeight: "700", lineHeight: 28 },
  description: { fontSize: 16, lineHeight: 24 },
});
