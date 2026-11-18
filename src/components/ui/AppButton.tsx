import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { radius, spacing, useAppTheme } from "@/theme";

type Props = PropsWithChildren<{
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  busy?: boolean;
}>;

export function AppButton({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
}: Props) {
  const { colors } = useAppTheme();
  const primary = variant === "primary";
  const foreground = primary ? colors.onPrimary : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.primary : colors.surface,
          borderColor: colors.primary,
          opacity: disabled || busy ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  label: { fontSize: 16, fontWeight: "700", textAlign: "center" },
});
