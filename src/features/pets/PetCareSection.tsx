import { useState } from "react";
import { Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { FeedbackState } from "@/components/ui/FeedbackState";
import {
  initialPetCareDraft,
  petCareInputFromDraft,
  type PetCareDraft,
} from "./petCareForm";
import { parseLocalDueDate } from "@/features/tasks/taskForm";
import {
  useCreateEntity,
  usePetCare,
  useSavePetCare,
} from "@/lib/query/entities";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import type { PetCareKind, PetCareRow } from "@/schemas/petCare";
import { spacing, useAppTheme } from "@/theme";

const labels = {
  health: {
    title: "Health events",
    singular: "health event",
    name: "Event type",
    first: "Event date",
    second: "",
    detail: "Notes",
  },
  medications: {
    title: "Medications",
    singular: "medication",
    name: "Medication name",
    first: "Start date",
    second: "End date",
    detail: "Dosage",
  },
  vaccinations: {
    title: "Vaccinations",
    singular: "vaccination",
    name: "Vaccination name",
    first: "Administered date",
    second: "Next due date",
    detail: "",
  },
} as const;

function summary(kind: PetCareKind, row: PetCareRow<PetCareKind>) {
  if (kind === "health") {
    const event = row as PetCareRow<"health">;
    return `${event.event_type} · ${new Date(event.occurred_at).toLocaleDateString()}${event.notes ? ` · ${event.notes}` : ""}`;
  }
  if (kind === "medications") {
    const medication = row as PetCareRow<"medications">;
    return `${medication.name}${medication.start_date ? ` · Started ${medication.start_date}` : ""}${medication.end_date ? ` · Ends ${medication.end_date}` : ""}${medication.dosage_text ? ` · ${medication.dosage_text}` : ""}`;
  }
  const vaccination = row as PetCareRow<"vaccinations">;
  return `${vaccination.name}${vaccination.administered_on ? ` · Given ${vaccination.administered_on}` : ""}${vaccination.due_on ? ` · Due ${vaccination.due_on}` : ""}`;
}

function dueTask(kind: PetCareKind, row: PetCareRow<PetCareKind>) {
  if (kind === "medications") {
    const medication = row as PetCareRow<"medications">;
    return medication.end_date
      ? {
          title: `Review ${medication.name} medication`,
          date: medication.end_date,
        }
      : null;
  }
  if (kind === "vaccinations") {
    const vaccination = row as PetCareRow<"vaccinations">;
    return vaccination.due_on
      ? { title: `${vaccination.name} vaccination`, date: vaccination.due_on }
      : null;
  }
  return null;
}

function recordName(kind: PetCareKind, row: PetCareRow<PetCareKind>) {
  return kind === "health"
    ? (row as PetCareRow<"health">).event_type
    : (row as PetCareRow<"medications"> | PetCareRow<"vaccinations">).name;
}

export function PetCareSection({
  kind,
  userId,
  petId,
  petName,
}: {
  kind: PetCareKind;
  userId: string;
  petId: string;
  petName: string;
}) {
  const { colors } = useAppTheme();
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<PetCareDraft | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const records = usePetCare(kind, userId, petId, page);
  const save = useSavePetCare(kind, userId, petId);
  const createTask = useCreateEntity("tasks", userId);
  const label = labels[kind];

  async function saveRecord() {
    if (!draft || busy) return;
    let input;
    try {
      input = petCareInputFromDraft(kind, draft);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check record details.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await save.mutateAsync({ id: editingId, input });
      setDraft(null);
      setEditingId(undefined);
      setPage(0);
      setMessage(`${label.singular} saved.`);
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : `Could not save ${label.singular}. Try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function createDueTask(row: PetCareRow<PetCareKind>) {
    const due = dueTask(kind, row);
    if (!due || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await createTask.mutateAsync({
        title: `${petName}: ${due.title}`,
        description: null,
        status: "pending",
        priority: "medium",
        due_at: parseLocalDueDate(due.date, "09:00"),
        pet_id: petId,
        vehicle_id: null,
      });
      setMessage("Due task created in Tasks.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not create task. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}
      >
        {label.title}
      </Text>
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {message}
        </Text>
      ) : null}
      {draft ? (
        <View style={{ gap: spacing.sm }}>
          <AppTextField
            label={label.name}
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
          />
          <AppTextField
            label={`${label.first} (YYYY-MM-DD${kind === "health" ? "" : ", optional"})`}
            value={draft.firstDate}
            keyboardType="numbers-and-punctuation"
            onChangeText={(firstDate) => setDraft({ ...draft, firstDate })}
          />
          {label.second ? (
            <AppTextField
              label={`${label.second} (YYYY-MM-DD, optional)`}
              value={draft.secondDate}
              keyboardType="numbers-and-punctuation"
              onChangeText={(secondDate) => setDraft({ ...draft, secondDate })}
            />
          ) : null}
          {label.detail ? (
            <AppTextField
              label={`${label.detail} (optional)`}
              value={draft.detail}
              multiline
              onChangeText={(detail) => setDraft({ ...draft, detail })}
            />
          ) : null}
          <AppButton onPress={() => void saveRecord()} busy={busy}>
            Save {label.singular}
          </AppButton>
          <AppButton
            variant="secondary"
            onPress={() => {
              setDraft(null);
              setEditingId(undefined);
              setMessage("");
            }}
          >
            Cancel
          </AppButton>
        </View>
      ) : (
        <AppButton
          onPress={() => {
            setDraft(initialPetCareDraft(kind));
            setEditingId(undefined);
            setMessage("");
          }}
        >
          Add {label.singular}
        </AppButton>
      )}
      {records.isPending ? (
        <FeedbackState
          kind="loading"
          title={`Loading ${label.title.toLowerCase()}…`}
        />
      ) : records.isError ? (
        <FeedbackState
          kind="error"
          title={`Could not load ${label.title.toLowerCase()}`}
          actionLabel="Retry"
          onAction={() => void records.refetch()}
        />
      ) : records.data?.length ? (
        <>
          {records.data.map((row) => {
            const due = dueTask(kind, row);
            return (
              <View key={row.id} style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.text }}>{summary(kind, row)}</Text>
                <AppButton
                  variant="secondary"
                  onPress={() => {
                    setEditingId(row.id);
                    setDraft(initialPetCareDraft(kind, row));
                    setMessage("");
                  }}
                >
                  Edit {recordName(kind, row)} {label.singular}
                </AppButton>
                {due ? (
                  <AppButton
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void createDueTask(row)}
                  >
                    Create due task for {recordName(kind, row)}
                  </AppButton>
                ) : null}
              </View>
            );
          })}
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
          >
            {page > 0 ? (
              <AppButton variant="secondary" onPress={() => setPage(page - 1)}>
                Newer {label.title.toLowerCase()}
              </AppButton>
            ) : null}
            {records.data.length === 100 ? (
              <AppButton variant="secondary" onPress={() => setPage(page + 1)}>
                Older {label.title.toLowerCase()}
              </AppButton>
            ) : null}
          </View>
        </>
      ) : (
        <FeedbackState
          kind="empty"
          title={`No ${label.title.toLowerCase()} yet`}
        />
      )}
    </View>
  );
}
