import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppTextField } from "@/components/ui/AppTextField";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { AttachmentSection } from "@/features/attachments/AttachmentSection";
import {
  useCreateEntity,
  useEntity,
  useEntityList,
  useTasksByCompletion,
  useTaskRecurrenceRules,
  useTaskReminders,
  useEnableTaskReminder,
  useDisableTaskReminder,
  useTaskOccurrenceHistory,
  useSaveTaskRecurrenceRule,
  useCompleteRecurringTask,
  useUpdateEntity,
} from "@/lib/query/entities";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import type { EntityRow } from "@/schemas/entities";
import type { RecurrenceRule } from "@/schemas/recurrence";
import { spacing, radius, useAppTheme } from "@/theme";
import {
  initialTaskDraft,
  taskInputFromDraft,
  type TaskDraft,
} from "@/features/tasks/taskForm";
import { resolveLocalTime, type Frequency } from "@/features/tasks/recurrence";
import { localDateAt } from "@/features/tasks/recurrence";
import {
  reconcileLocalReminders,
  requestReminderPermission,
} from "@/services/notifications/localNotifications";

type Completion = "all" | "pending" | "completed";
type RepeatDraft = {
  frequency: Frequency;
  interval: string;
  weekdays: number[];
  timezone: string;
  endDate: string;
};
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TasksScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const { colors } = useAppTheme();
  const [filter, setFilter] = useState<Completion>("all");
  const [page, setPage] = useState(0);
  const [petPage, setPetPage] = useState(0);
  const [vehiclePage, setVehiclePage] = useState(0);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [editing, setEditing] = useState<EntityRow<"tasks"> | null>(null);
  const [repeatTask, setRepeatTask] = useState<EntityRow<"tasks"> | null>(null);
  const [repeatDraft, setRepeatDraft] = useState<RepeatDraft | null>(null);
  const [historyTask, setHistoryTask] = useState<EntityRow<"tasks"> | null>(
    null,
  );
  const [historyPage, setHistoryPage] = useState(0);
  const [attachmentTask, setAttachmentTask] =
    useState<EntityRow<"tasks"> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const tasks = useTasksByCompletion(userId, filter, page);
  const rules = useTaskRecurrenceRules(
    userId,
    tasks.data?.map((task) => task.id) ?? [],
  );
  const reminders = useTaskReminders(
    userId,
    tasks.data?.map((task) => task.id) ?? [],
  );
  const selectedTask = repeatTask ?? historyTask;
  const occurrences = useTaskOccurrenceHistory(
    userId,
    selectedTask?.id,
    historyPage,
  );
  const pets = useEntityList("pets", userId, petPage);
  const vehicles = useEntityList("vehicles", userId, vehiclePage);
  const linkedPet = useEntity("pets", userId, draft?.petId ?? undefined);
  const linkedVehicle = useEntity(
    "vehicles",
    userId,
    draft?.vehicleId ?? undefined,
  );
  const createTask = useCreateEntity("tasks", userId);
  const updateTask = useUpdateEntity("tasks", userId);
  const saveRule = useSaveTaskRecurrenceRule(userId);
  const completeRecurring = useCompleteRecurringTask(userId);
  const enableReminder = useEnableTaskReminder(userId);
  const disableReminder = useDisableTaskReminder(userId);

  function ruleFor(taskId: string) {
    return rules.data?.find((rule) => rule.task_id === taskId) ?? null;
  }

  function reminderFor(taskId: string) {
    return reminders.data?.find((reminder) => reminder.task_id === taskId);
  }

  async function syncReminders() {
    await reconcileLocalReminders(userId);
    await reminders.refetch();
  }

  async function toggleReminder(task: EntityRow<"tasks">) {
    if (busyId) return;
    setBusyId(task.id);
    setMessage("");
    try {
      if (reminderFor(task.id)) {
        await disableReminder.mutateAsync(task.id);
        try {
          await syncReminders();
          setMessage("Reminder off.");
        } catch {
          setMessage("Reminder turned off; device sync will retry.");
        }
      } else {
        if (!(await requestReminderPermission())) {
          setMessage(
            "Allow notifications in device settings to enable a reminder.",
          );
          return;
        }
        await enableReminder.mutateAsync(task.id);
        try {
          await syncReminders();
          setMessage("Reminder on for the due time.");
        } catch {
          setMessage("Reminder saved; device sync will retry.");
        }
      }
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not change reminder.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function editTask(task?: EntityRow<"tasks">) {
    setEditing(task ?? null);
    setDraft(initialTaskDraft(task));
    setMessage("");
  }

  async function save() {
    if (!draft || busyId) return;
    let input: ReturnType<typeof taskInputFromDraft>;
    try {
      input = taskInputFromDraft(draft);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check task details.",
      );
      return;
    }
    setBusyId("save");
    setMessage("");
    try {
      if (editing) {
        const { status: _status, ...changes } = input;
        if (ruleFor(editing.id)) {
          const { due_at: _due, ...withoutDue } = changes;
          await updateTask.mutateAsync({ id: editing.id, changes: withoutDue });
        } else {
          await updateTask.mutateAsync({ id: editing.id, changes });
        }
      } else {
        await createTask.mutateAsync(input);
      }
      setDraft(null);
      setEditing(null);
      setPage(0);
      try {
        await syncReminders();
        setMessage("Task saved.");
      } catch {
        setMessage("Task saved; reminder sync will retry.");
      }
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not save task. Check the linked item and try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCompletion(
    task: EntityRow<"tasks">,
    rule: RecurrenceRule | null,
  ) {
    if (busyId) return;
    setBusyId(task.id);
    setMessage("");
    try {
      if (rule) {
        await completeRecurring.mutateAsync({ task, rule });
        try {
          await syncReminders();
          setMessage("Occurrence completed.");
        } catch {
          setMessage("Occurrence completed; reminder sync will retry.");
        }
        return;
      }
      const completed = Boolean(task.completed_at);
      await updateTask.mutateAsync({
        id: task.id,
        changes: {
          status: completed ? "pending" : "completed",
          completed_at: completed ? null : new Date().toISOString(),
        },
      });
      try {
        await syncReminders();
        setMessage(completed ? "Task reopened." : "Task completed.");
      } catch {
        setMessage("Task updated; reminder sync will retry.");
      }
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not update task. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function openRepeat(task: EntityRow<"tasks">) {
    const rule = ruleFor(task.id);
    setRepeatTask(task);
    setRepeatDraft({
      frequency: rule?.frequency ?? "daily",
      interval: String(rule?.interval ?? 1),
      weekdays: rule?.weekdays ?? [],
      timezone:
        rule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      endDate: rule?.end_at ? localDateAt(rule.end_at, rule.timezone) : "",
    });
    setHistoryPage(0);
    setMessage("");
  }

  async function saveRepeat() {
    if (!repeatTask || !repeatDraft || busyId) return;
    const interval = Number(repeatDraft.interval);
    if (!Number.isSafeInteger(interval) || interval < 1) {
      setMessage("Enter a positive whole-number interval.");
      return;
    }
    setBusyId("repeat");
    setMessage("");
    try {
      const end_at = repeatDraft.endDate.trim()
        ? resolveLocalTime(
            repeatDraft.endDate.trim(),
            "23:59",
            repeatDraft.timezone,
          )
        : null;
      await saveRule.mutateAsync({
        task: repeatTask,
        existing: ruleFor(repeatTask.id),
        lastCompletedDate: occurrences.data?.[0]?.scheduled_local_date ?? null,
        input: {
          frequency: repeatDraft.frequency,
          interval,
          weekdays:
            repeatDraft.frequency === "weekly" && repeatDraft.weekdays.length
              ? repeatDraft.weekdays
              : null,
          timezone: repeatDraft.timezone.trim(),
          end_at,
        },
      });
      setRepeatTask(null);
      setRepeatDraft(null);
      try {
        await syncReminders();
        setMessage("Repeat schedule saved.");
      } catch {
        setMessage("Repeat saved; reminder sync will retry.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save repeat schedule.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function choice(
    label: string,
    selected: boolean,
    onPress: () => void,
    key = label,
  ) {
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[
          styles.choice,
          {
            backgroundColor: selected ? colors.primary : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={{ color: selected ? colors.onPrimary : colors.text }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <AppScreen scroll>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        Tasks
      </Text>
      {draft ? (
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            {editing ? "Edit task" : "New task"}
          </Text>
          <AppTextField
            label="Title"
            value={draft.title}
            maxLength={200}
            onChangeText={(title) => setDraft({ ...draft, title })}
          />
          <AppTextField
            label="Description (optional)"
            value={draft.description}
            multiline
            onChangeText={(description) => setDraft({ ...draft, description })}
          />
          <Text style={{ color: colors.text }}>Priority</Text>
          <View style={styles.choices}>
            {(["low", "medium", "high"] as const).map((priority) =>
              choice(priority, draft.priority === priority, () =>
                setDraft({ ...draft, priority }),
              ),
            )}
          </View>
          {editing && ruleFor(editing.id) ? (
            <Text style={{ color: colors.muted }}>
              The due date follows the repeat schedule. Edit repeat settings
              from the task list.
            </Text>
          ) : (
            <AppTextField
              label="Due date (YYYY-MM-DD, optional)"
              value={draft.dueDate}
              placeholder="2027-05-01"
              keyboardType="numbers-and-punctuation"
              onChangeText={(dueDate) => setDraft({ ...draft, dueDate })}
            />
          )}
          {draft.dueDate && !(editing && ruleFor(editing.id)) ? (
            <AppTextField
              label="Due time (HH:mm, device time zone)"
              value={draft.dueTime}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              onChangeText={(dueTime) => setDraft({ ...draft, dueTime })}
            />
          ) : null}
          <Text style={{ color: colors.text }}>Linked item (optional)</Text>
          {draft.petId && linkedPet.data ? (
            <Text style={{ color: colors.muted }}>
              Selected pet: {linkedPet.data.name}
            </Text>
          ) : null}
          {draft.vehicleId && linkedVehicle.data ? (
            <Text style={{ color: colors.muted }}>
              Selected vehicle: {linkedVehicle.data.year}{" "}
              {linkedVehicle.data.make} {linkedVehicle.data.model}
            </Text>
          ) : null}
          <View style={styles.choices}>
            {choice("None", !draft.petId && !draft.vehicleId, () =>
              setDraft({ ...draft, petId: null, vehicleId: null }),
            )}
          </View>
          {pets.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load pets"
              actionLabel="Retry"
              onAction={() => void pets.refetch()}
            />
          ) : pets.isPending ? (
            <FeedbackState kind="loading" title="Loading pets…" />
          ) : (
            <>
              <View style={styles.choices}>
                {pets.data?.map((pet) =>
                  choice(
                    `Pet: ${pet.name}`,
                    draft.petId === pet.id,
                    () =>
                      setDraft({ ...draft, petId: pet.id, vehicleId: null }),
                    pet.id,
                  ),
                )}
              </View>
              {petPage > 0 || pets.data?.length === 100 ? (
                <View style={styles.choices}>
                  {petPage > 0 ? (
                    <AppButton
                      variant="secondary"
                      onPress={() => setPetPage(petPage - 1)}
                    >
                      Previous pets
                    </AppButton>
                  ) : null}
                  {pets.data?.length === 100 ? (
                    <AppButton
                      variant="secondary"
                      onPress={() => setPetPage(petPage + 1)}
                    >
                      More pets
                    </AppButton>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
          {vehicles.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load vehicles"
              actionLabel="Retry"
              onAction={() => void vehicles.refetch()}
            />
          ) : vehicles.isPending ? (
            <FeedbackState kind="loading" title="Loading vehicles…" />
          ) : (
            <>
              <View style={styles.choices}>
                {vehicles.data?.map((vehicle) =>
                  choice(
                    `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                    draft.vehicleId === vehicle.id,
                    () =>
                      setDraft({
                        ...draft,
                        petId: null,
                        vehicleId: vehicle.id,
                      }),
                    vehicle.id,
                  ),
                )}
              </View>
              {vehiclePage > 0 || vehicles.data?.length === 100 ? (
                <View style={styles.choices}>
                  {vehiclePage > 0 ? (
                    <AppButton
                      variant="secondary"
                      onPress={() => setVehiclePage(vehiclePage - 1)}
                    >
                      Previous vehicles
                    </AppButton>
                  ) : null}
                  {vehicles.data?.length === 100 ? (
                    <AppButton
                      variant="secondary"
                      onPress={() => setVehiclePage(vehiclePage + 1)}
                    >
                      More vehicles
                    </AppButton>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
          <AppButton onPress={() => void save()} busy={busyId === "save"}>
            Save task
          </AppButton>
          {!editing ? (
            <Text style={{ color: colors.muted }}>
              Save this task, then choose Add repeat to set a schedule.
            </Text>
          ) : null}
          <AppButton
            variant="secondary"
            onPress={() => {
              setDraft(null);
              setEditing(null);
              setMessage("");
            }}
          >
            Cancel
          </AppButton>
        </View>
      ) : repeatTask && repeatDraft ? (
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            Repeat: {repeatTask.title}
          </Text>
          <Text style={{ color: colors.text }}>Frequency</Text>
          <View style={styles.choices}>
            {(["daily", "weekly", "monthly", "yearly"] as const).map(
              (frequency) =>
                choice(frequency, repeatDraft.frequency === frequency, () =>
                  setRepeatDraft({ ...repeatDraft, frequency }),
                ),
            )}
          </View>
          <AppTextField
            label="Every (interval)"
            value={repeatDraft.interval}
            keyboardType="number-pad"
            onChangeText={(interval) =>
              setRepeatDraft({ ...repeatDraft, interval })
            }
          />
          {repeatDraft.frequency === "weekly" ? (
            <>
              <Text style={{ color: colors.text }}>
                Days (leave empty for the due weekday)
              </Text>
              <View style={styles.choices}>
                {weekdayNames.map((name, day) =>
                  choice(
                    name,
                    repeatDraft.weekdays.includes(day),
                    () =>
                      setRepeatDraft({
                        ...repeatDraft,
                        weekdays: repeatDraft.weekdays.includes(day)
                          ? repeatDraft.weekdays.filter(
                              (value) => value !== day,
                            )
                          : [...repeatDraft.weekdays, day].sort(),
                      }),
                    name,
                  ),
                )}
              </View>
            </>
          ) : null}
          <AppTextField
            label="Time zone (IANA)"
            value={repeatDraft.timezone}
            onChangeText={(timezone) =>
              setRepeatDraft({ ...repeatDraft, timezone })
            }
          />
          <AppTextField
            label="End date (YYYY-MM-DD, optional)"
            value={repeatDraft.endDate}
            keyboardType="numbers-and-punctuation"
            onChangeText={(endDate) =>
              setRepeatDraft({ ...repeatDraft, endDate })
            }
          />
          <AppButton
            onPress={() => void saveRepeat()}
            busy={busyId === "repeat"}
            disabled={occurrences.isPending || occurrences.isError}
          >
            Save repeat
          </AppButton>
          {occurrences.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load completion history"
              actionLabel="Retry"
              onAction={() => void occurrences.refetch()}
            />
          ) : null}
          <AppButton
            variant="secondary"
            onPress={() => {
              setRepeatTask(null);
              setRepeatDraft(null);
              setMessage("");
            }}
          >
            Cancel
          </AppButton>
        </View>
      ) : historyTask ? (
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            History: {historyTask.title}
          </Text>
          {occurrences.isPending ? (
            <FeedbackState kind="loading" title="Loading history…" />
          ) : occurrences.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load history"
              actionLabel="Retry"
              onAction={() => void occurrences.refetch()}
            />
          ) : occurrences.data?.length ? (
            <>
              {occurrences.data.map((item) => (
                <Text key={item.id} style={{ color: colors.text }}>
                  {item.scheduled_local_date} · Completed{" "}
                  {new Date(item.completed_at).toLocaleString()}
                </Text>
              ))}
              <View style={styles.choices}>
                {historyPage > 0 ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => setHistoryPage(historyPage - 1)}
                  >
                    Newer history
                  </AppButton>
                ) : null}
                {occurrences.data.length === 100 ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => setHistoryPage(historyPage + 1)}
                  >
                    Older history
                  </AppButton>
                ) : null}
              </View>
            </>
          ) : (
            <FeedbackState kind="empty" title="No completed occurrences" />
          )}
          <AppButton variant="secondary" onPress={() => setHistoryTask(null)}>
            Back to tasks
          </AppButton>
        </View>
      ) : attachmentTask ? (
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            {attachmentTask.title}
          </Text>
          <AttachmentSection
            key={attachmentTask.id}
            target="tasks"
            userId={userId}
            entityId={attachmentTask.id}
          />
          <AppButton
            variant="secondary"
            onPress={() => setAttachmentTask(null)}
          >
            Back to tasks
          </AppButton>
        </View>
      ) : (
        <>
          <AppButton onPress={() => editTask()}>New task</AppButton>
          <View style={styles.choices}>
            {(["all", "pending", "completed"] as const).map((value) =>
              choice(value, filter === value, () => {
                setFilter(value);
                setPage(0);
              }),
            )}
          </View>
          {tasks.isPending ? (
            <FeedbackState kind="loading" title="Loading tasks…" />
          ) : tasks.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load tasks"
              actionLabel="Try again"
              onAction={() => void tasks.refetch()}
            />
          ) : tasks.data?.length === 0 ? (
            <FeedbackState
              kind="empty"
              title={page ? "No more tasks" : "No tasks in this view"}
            />
          ) : (
            tasks.data?.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.heading, { color: colors.text }]}>
                  {task.title}
                </Text>
                {task.description ? (
                  <Text style={{ color: colors.muted }}>
                    {task.description}
                  </Text>
                ) : null}
                <Text style={{ color: colors.muted }}>
                  {task.completed_at ? "Completed" : "Pending"} ·{" "}
                  {task.priority} priority
                  {task.due_at
                    ? ` · Due ${new Date(task.due_at).toLocaleString()}`
                    : ""}
                </Text>
                {task.pet_id ? (
                  <Text style={{ color: colors.muted }}>
                    Linked pet:{" "}
                    {pets.data?.find((pet) => pet.id === task.pet_id)?.name ??
                      "Pet"}
                  </Text>
                ) : null}
                {task.vehicle_id ? (
                  <Text style={{ color: colors.muted }}>
                    Linked vehicle:{" "}
                    {vehicles.data?.find(
                      (vehicle) => vehicle.id === task.vehicle_id,
                    )?.model ?? "Vehicle"}
                  </Text>
                ) : null}
                <AppButton
                  variant="secondary"
                  onPress={() => editTask(task)}
                  disabled={rules.isPending || rules.isError}
                >
                  Edit
                </AppButton>
                <AppButton
                  variant="secondary"
                  onPress={() => setAttachmentTask(task)}
                >
                  Attachments for {task.title}
                </AppButton>
                {task.due_at && !task.completed_at ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => openRepeat(task)}
                    disabled={rules.isPending || rules.isError}
                  >
                    {ruleFor(task.id) ? "Edit repeat" : "Add repeat"}
                  </AppButton>
                ) : null}
                {ruleFor(task.id) ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => {
                      setHistoryPage(0);
                      setHistoryTask(task);
                    }}
                  >
                    History
                  </AppButton>
                ) : null}
                {(task.due_at && !task.completed_at) || reminderFor(task.id) ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => void toggleReminder(task)}
                    busy={busyId === task.id}
                    disabled={
                      Boolean(busyId) ||
                      reminders.isPending ||
                      reminders.isError
                    }
                  >
                    {reminderFor(task.id)
                      ? "Turn off reminder"
                      : "Remind at due time"}
                  </AppButton>
                ) : null}
                {!(ruleFor(task.id) && task.completed_at) ? (
                  <AppButton
                    onPress={() =>
                      void toggleCompletion(task, ruleFor(task.id))
                    }
                    busy={busyId === task.id}
                    disabled={
                      Boolean(busyId) || rules.isPending || rules.isError
                    }
                  >
                    {ruleFor(task.id)
                      ? "Complete occurrence"
                      : task.completed_at
                        ? "Reopen"
                        : "Complete"}
                  </AppButton>
                ) : null}
              </View>
            ))
          )}
          {rules.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load repeat schedules"
              actionLabel="Retry"
              onAction={() => void rules.refetch()}
            />
          ) : null}
          {reminders.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load reminders"
              actionLabel="Retry"
              onAction={() => void reminders.refetch()}
            />
          ) : null}
          {page > 0 || tasks.data?.length === 100 ? (
            <View style={styles.choices}>
              {page > 0 ? (
                <AppButton
                  variant="secondary"
                  onPress={() => setPage(page - 1)}
                >
                  Previous tasks
                </AppButton>
              ) : null}
              {tasks.data?.length === 100 ? (
                <AppButton
                  variant="secondary"
                  onPress={() => setPage(page + 1)}
                >
                  More tasks
                </AppButton>
              ) : null}
            </View>
          ) : null}
        </>
      )}
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {message}
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "700" },
  heading: { fontSize: 20, fontWeight: "700" },
  section: { gap: spacing.md },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
});
