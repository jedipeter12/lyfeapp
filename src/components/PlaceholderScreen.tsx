import type { PropsWithChildren } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function PlaceholderScreen({ title, description, children }: Props) {
  const dark = useColorScheme() === "dark";
  const foreground = dark ? "#F9FAFB" : "#18212F";

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: dark ? "#101827" : "#FFFFFF" },
      ]}
    >
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: foreground }]}
        >
          {title}
        </Text>
        <Text style={[styles.description, { color: foreground }]}>
          {description}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 30, fontWeight: "700" },
  description: { fontSize: 16, lineHeight: 24 },
});
