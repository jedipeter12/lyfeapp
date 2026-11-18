import type { PropsWithChildren } from "react";
import { StyleSheet, Text } from "react-native";
import { AppScreen } from "./ui/AppScreen";
import { FeedbackState } from "./ui/FeedbackState";
import { spacing, useAppTheme } from "@/theme";

type Props = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function PlaceholderScreen({ title, description, children }: Props) {
  const { colors } = useAppTheme();

  return (
    <AppScreen scroll>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <FeedbackState
        kind="empty"
        title="Nothing here yet"
        description={description}
      />
      {children}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "700", marginBottom: spacing.xl },
});
