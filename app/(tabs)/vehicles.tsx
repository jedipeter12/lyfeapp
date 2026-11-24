import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppTextField } from "@/components/ui/AppTextField";
import { FeedbackState } from "@/components/ui/FeedbackState";
import {
  initialVehicleDraft,
  mileageInputFromDraft,
  vehicleInputFromDraft,
  type VehicleDraft,
} from "@/features/vehicles/vehicleForm";
import {
  useAddVehicleMileage,
  useCreateEntity,
  useEntityList,
  useUpdateEntity,
  useVehicleMileage,
} from "@/lib/query/entities";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import type { EntityRow } from "@/schemas/entities";
import { radius, spacing, useAppTheme } from "@/theme";

export default function VehiclesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const { colors } = useAppTheme();
  const [page, setPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [selected, setSelected] = useState<EntityRow<"vehicles"> | null>(null);
  const [editing, setEditing] = useState<EntityRow<"vehicles"> | null>(null);
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  const [mileage, setMileage] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const vehicles = useEntityList("vehicles", userId, page);
  const history = useVehicleMileage(userId, selected?.id, historyPage);
  const createVehicle = useCreateEntity("vehicles", userId);
  const updateVehicle = useUpdateEntity("vehicles", userId);
  const addMileage = useAddVehicleMileage(userId);

  function openEditor(vehicle?: EntityRow<"vehicles">) {
    setEditing(vehicle ?? null);
    setDraft(initialVehicleDraft(vehicle));
    setMessage("");
  }

  async function saveVehicle() {
    if (!draft || busy) return;
    let input: ReturnType<typeof vehicleInputFromDraft>;
    try {
      input = vehicleInputFromDraft(draft);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check vehicle details.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const saved = editing
        ? await updateVehicle.mutateAsync({ id: editing.id, changes: input })
        : await createVehicle.mutateAsync(input);
      setSelected(saved);
      setDraft(null);
      setEditing(null);
      setPage(0);
      setMessage("Vehicle saved.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not save vehicle. Check whether its VIN is already used.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logMileage() {
    if (!selected || busy) return;
    let input: ReturnType<typeof mileageInputFromDraft>;
    try {
      input = mileageInputFromDraft(mileage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Check mileage.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await addMileage.mutateAsync({ vehicleId: selected.id, ...input });
      setMileage("");
      setHistoryPage(0);
      setMessage("Mileage reading recorded.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not record mileage.",
      );
    } finally {
      setBusy(false);
    }
  }

  const setField = (field: keyof VehicleDraft) => (value: string) =>
    setDraft((current) => (current ? { ...current, [field]: value } : current));

  return (
    <AppScreen scroll>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: colors.text }]}
      >
        Vehicles
      </Text>
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {message}
        </Text>
      ) : null}
      {draft ? (
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.subheading, { color: colors.text }]}
          >
            {editing ? "Edit vehicle" : "New vehicle"}
          </Text>
          <AppTextField
            label="Year"
            value={draft.year}
            onChangeText={setField("year")}
            keyboardType="number-pad"
          />
          <AppTextField
            label="Make"
            value={draft.make}
            onChangeText={setField("make")}
          />
          <AppTextField
            label="Model"
            value={draft.model}
            onChangeText={setField("model")}
          />
          <AppTextField
            label="VIN (optional)"
            value={draft.vin}
            onChangeText={setField("vin")}
            autoCapitalize="characters"
            accessibilityHint="Spaces are removed and letters are capitalized."
          />
          <AppTextField
            label="Current mileage (optional)"
            value={draft.currentMileage}
            onChangeText={setField("currentMileage")}
            keyboardType="number-pad"
          />
          <AppButton onPress={saveVehicle} busy={busy}>
            Save vehicle
          </AppButton>
          <AppButton
            variant="secondary"
            onPress={() => setDraft(null)}
            disabled={busy}
          >
            Cancel
          </AppButton>
        </View>
      ) : selected ? (
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.subheading, { color: colors.text }]}
          >
            {selected.year} {selected.make} {selected.model}
          </Text>
          <Text style={{ color: colors.text }}>
            VIN: {selected.vin ?? "Not set"}
          </Text>
          <Text style={{ color: colors.text }}>
            Current mileage:{" "}
            {selected.current_mileage?.toLocaleString() ?? "Not set"}
          </Text>
          <AppButton onPress={() => openEditor(selected)} variant="secondary">
            Edit vehicle
          </AppButton>
          <AppTextField
            label="New mileage reading"
            value={mileage}
            onChangeText={setMileage}
            keyboardType="number-pad"
          />
          <AppButton onPress={logMileage} busy={busy}>
            Record reading
          </AppButton>
          <Text style={{ color: colors.muted }}>
            Readings are saved in history. Edit the vehicle to change current
            mileage.
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.subheading, { color: colors.text }]}
          >
            Mileage history
          </Text>
          {history.isPending ? (
            <FeedbackState kind="loading" title="Loading mileage…" />
          ) : history.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load mileage"
              actionLabel="Try again"
              onAction={() => history.refetch()}
            />
          ) : history.data?.length ? (
            history.data.map((entry) => (
              <Text key={entry.id} style={{ color: colors.text }}>
                {entry.odometer.toLocaleString()} miles ·{" "}
                {new Date(entry.recorded_at).toLocaleString()}
              </Text>
            ))
          ) : (
            <FeedbackState kind="empty" title="No mileage readings yet" />
          )}
          <View style={styles.actions}>
            {historyPage > 0 ? (
              <AppButton
                variant="secondary"
                onPress={() => setHistoryPage(historyPage - 1)}
              >
                Previous readings
              </AppButton>
            ) : null}
            {history.data?.length === 100 ? (
              <AppButton
                variant="secondary"
                onPress={() => setHistoryPage(historyPage + 1)}
              >
                More readings
              </AppButton>
            ) : null}
          </View>
          <AppButton
            variant="secondary"
            onPress={() => {
              setSelected(null);
              setHistoryPage(0);
            }}
          >
            Back to vehicles
          </AppButton>
        </View>
      ) : (
        <View style={styles.section}>
          <AppButton onPress={() => openEditor()}>New vehicle</AppButton>
          {vehicles.isPending ? (
            <FeedbackState kind="loading" title="Loading vehicles…" />
          ) : vehicles.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load vehicles"
              actionLabel="Try again"
              onAction={() => vehicles.refetch()}
            />
          ) : vehicles.data?.length ? (
            vehicles.data.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                accessibilityRole="button"
                onPress={() => {
                  setSelected(vehicle);
                  setHistoryPage(0);
                  setMessage("");
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
                <Text style={{ color: colors.muted }}>
                  {vehicle.current_mileage == null
                    ? "No current mileage"
                    : `${vehicle.current_mileage.toLocaleString()} miles`}
                </Text>
              </Pressable>
            ))
          ) : (
            <FeedbackState kind="empty" title="No vehicles yet" />
          )}
          <View style={styles.actions}>
            {page > 0 ? (
              <AppButton variant="secondary" onPress={() => setPage(page - 1)}>
                Previous vehicles
              </AppButton>
            ) : null}
            {vehicles.data?.length === 100 ? (
              <AppButton variant="secondary" onPress={() => setPage(page + 1)}>
                More vehicles
              </AppButton>
            ) : null}
          </View>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 28, fontWeight: "700" },
  subheading: { fontSize: 20, fontWeight: "700" },
  section: { gap: spacing.md },
  actions: { gap: spacing.sm },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 60,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 17, fontWeight: "700" },
});
