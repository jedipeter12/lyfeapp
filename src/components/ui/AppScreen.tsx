import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme, spacing } from "@/theme";

type Props = PropsWithChildren<{ scroll?: boolean; centered?: boolean }>;

export function AppScreen({
  children,
  scroll = false,
  centered = false,
}: Props) {
  const { colors } = useAppTheme();
  const contentStyle = [styles.content, centered && styles.centered];
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  centered: { justifyContent: "center" },
});
