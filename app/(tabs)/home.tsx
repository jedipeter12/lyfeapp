import { useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Switch, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { FeedbackState } from "@/components/ui/FeedbackState";
import {
  useDashboard,
  useModulePreferences,
  useSetModuleEnabled,
} from "@/lib/query/dashboard";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import { type ModuleType } from "@/schemas/dashboard";
import { radius, spacing, useAppTheme } from "@/theme";

const modules: { key: ModuleType; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "pets", label: "Pets" },
  { key: "vehicles", label: "Vehicles" },
];

export default function HomeScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const router = useRouter();
  const { colors } = useAppTheme();
  const dashboard = useDashboard(userId);
  const preferences = useModulePreferences(userId);
  const setModuleEnabled = useSetModuleEnabled(userId);
  const [message, setMessage] = useState("");
  const enabled = (module: ModuleType) =>
    preferences.data?.find((item) => item.module_type === module)?.enabled ??
    true;

  async function toggle(module: ModuleType, value: boolean) {
    setMessage("");
    try {
      await setModuleEnabled.mutateAsync({ module, enabled: value });
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not save module preference. Try again.",
      );
    }
  }

  function section(title: string, children: ReactNode) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          {title}
        </Text>
        {children}
      </View>
    );
  }

  return (
    <AppScreen scroll>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        Home
      </Text>
      {preferences.isPending ? (
        <FeedbackState kind="loading" title="Loading module preferences…" />
      ) : preferences.isError ? (
        <FeedbackState
          kind="error"
          title="Could not load module preferences"
          actionLabel="Retry"
          onAction={() => void preferences.refetch()}
        />
      ) : (
        section(
          "Modules",
          <>
            <Text style={{ color: colors.muted }}>
              Choose which modules appear in the tabs and overview.
            </Text>
            {modules.map(({ key, label }) => (
              <View key={key} style={styles.preferenceRow}>
                <Text style={[styles.body, { color: colors.text }]}>
                  {label}
                </Text>
                <Switch
                  accessibilityLabel={`${label} enabled`}
                  value={enabled(key)}
                  disabled={setModuleEnabled.isPending}
                  onValueChange={(value) => void toggle(key, value)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>
            ))}
          </>,
        )
      )}
      {message ? <Text style={{ color: colors.error }}>{message}</Text> : null}
      {dashboard.isPending ? (
        <FeedbackState kind="loading" title="Loading overview…" />
      ) : dashboard.isError ? (
        <FeedbackState
          kind="error"
          title="Could not load overview"
          actionLabel="Retry"
          onAction={() => void dashboard.refetch()}
        />
      ) : (
        <>
          {enabled("tasks")
            ? section(
                "Upcoming tasks",
                dashboard.data?.tasks.length ? (
                  <>
                    {dashboard.data.tasks.map((task) => (
                      <View key={task.id} style={styles.item}>
                        <Text style={[styles.body, { color: colors.text }]}>
                          {task.title}
                        </Text>
                        <Text style={{ color: colors.muted }}>
                          {task.due_at
                            ? new Date(task.due_at).toLocaleString()
                            : ""}
                        </Text>
                      </View>
                    ))}
                    <AppButton
                      variant="secondary"
                      onPress={() => router.push("/tasks")}
                    >
                      Open tasks
                    </AppButton>
                  </>
                ) : (
                  <Text style={{ color: colors.muted }}>
                    No upcoming tasks.
                  </Text>
                ),
              )
            : null}
          {enabled("tasks")
            ? section(
                "Reminders",
                dashboard.data?.reminders.length ? (
                  dashboard.data.reminders.map((reminder) => (
                    <View key={reminder.id} style={styles.item}>
                      <Text style={[styles.body, { color: colors.text }]}>
                        {reminder.title}
                      </Text>
                      <Text style={{ color: colors.muted }}>
                        {new Date(reminder.at).toLocaleString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: colors.muted }}>
                    No upcoming reminders.
                  </Text>
                ),
              )
            : null}
          {section(
            "Recent records",
            dashboard.data?.recent.filter((item) => enabled(item.module))
              .length ? (
              dashboard.data.recent
                .filter((item) => enabled(item.module))
                .map((item) => (
                  <View key={`${item.module}-${item.id}`} style={styles.item}>
                    <Text style={[styles.body, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.muted }}>
                      {item.at.length === 10
                        ? item.at
                        : new Date(item.at).toLocaleDateString()}
                    </Text>
                  </View>
                ))
            ) : (
              <Text style={{ color: colors.muted }}>No recent records.</Text>
            ),
          )}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "700" },
  heading: { fontSize: 21, fontWeight: "700" },
  body: { fontSize: 16 },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  item: { gap: spacing.xs, paddingVertical: spacing.xs },
  preferenceRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
