import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppTextField } from "@/components/ui/AppTextField";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { AttachmentSection } from "@/features/attachments/AttachmentSection";
import {
  initialVehicleDraft,
  mileageInputFromDraft,
  vehicleInputFromDraft,
  type VehicleDraft,
} from "@/features/vehicles/vehicleForm";
import {
  initialServiceDraft,
  serviceDraftFromRecord,
  serviceInputFromDraft,
  type ServiceDraft,
} from "@/features/vehicles/serviceForm";
import {
  useAddVehicleService,
  useAddVehicleMileage,
  useCreateEntity,
  useEntityList,
  useUpdateEntity,
  useVehicleMileage,
  useVehicleServices,
  useVehicleTasks,
  useUpdateVehicleService,
} from "@/lib/query/entities";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import type { EntityRow } from "@/schemas/entities";
import type { ServiceRecord } from "@/schemas/vehicles";
import { radius, spacing, useAppTheme } from "@/theme";

export default function VehiclesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const { colors } = useAppTheme();
  const [page, setPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [servicePage, setServicePage] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const [selected, setSelected] = useState<EntityRow<"vehicles"> | null>(null);
  const [editing, setEditing] = useState<EntityRow<"vehicles"> | null>(null);
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  const [mileage, setMileage] = useState("");
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft | null>(null);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(
    null,
  );
  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const vehicles = useEntityList("vehicles", userId, page);
  const history = useVehicleMileage(userId, selected?.id, historyPage);
  const services = useVehicleServices(userId, selected?.id, servicePage);
  const linkedTasks = useVehicleTasks(userId, selected?.id, taskPage);
  const createVehicle = useCreateEntity("vehicles", userId);
  const updateVehicle = useUpdateEntity("vehicles", userId);
  const addMileage = useAddVehicleMileage(userId);
  const addService = useAddVehicleService(userId, selected?.id ?? "");
  const updateService = useUpdateVehicleService(userId, selected?.id ?? "");
  const createTask = useCreateEntity("tasks", userId);

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

  async function saveService() {
    if (!selected || !serviceDraft || busy) return;
    let input: ReturnType<typeof serviceInputFromDraft>;
    try {
      input = serviceInputFromDraft(serviceDraft);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check service details.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (editingService)
        await updateService.mutateAsync({ id: editingService.id, input });
      else await addService.mutateAsync(input);
      setServiceDraft(null);
      setEditingService(null);
      setServicePage(0);
      setMessage("Service recorded.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not record service.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addMaintenanceTask() {
    if (!selected || busy) return;
    const title = maintenanceTitle.trim();
    if (!title) {
      setMessage("Enter a maintenance task title.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await createTask.mutateAsync({
        title,
        status: "pending",
        priority: "medium",
        vehicle_id: selected.id,
        pet_id: null,
        due_at: null,
        description: null,
      });
      setMaintenanceTitle("");
      setTaskPage(0);
      setMessage("Maintenance task added.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not add task.",
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
          <AttachmentSection
            key={selected.id}
            target="vehicles"
            userId={userId}
            entityId={selected.id}
          />
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
          <Text
            accessibilityRole="header"
            style={[styles.subheading, { color: colors.text }]}
          >
            Service and expense history
          </Text>
          {serviceDraft ? (
            <View style={styles.section}>
              <AppTextField
                label="Service type"
                value={serviceDraft.serviceType}
                onChangeText={(serviceType) =>
                  setServiceDraft({ ...serviceDraft, serviceType })
                }
              />
              <AppTextField
                label="Performed on (YYYY-MM-DD)"
                value={serviceDraft.performedOn}
                onChangeText={(performedOn) =>
                  setServiceDraft({ ...serviceDraft, performedOn })
                }
              />
              <AppTextField
                label="Odometer (optional)"
                value={serviceDraft.odometer}
                onChangeText={(odometer) =>
                  setServiceDraft({ ...serviceDraft, odometer })
                }
                keyboardType="number-pad"
              />
              <AppTextField
                label="Cost (optional)"
                value={serviceDraft.cost}
                onChangeText={(cost) =>
                  setServiceDraft({ ...serviceDraft, cost })
                }
                keyboardType="decimal-pad"
              />
              <AppTextField
                label="Currency code (optional)"
                value={serviceDraft.currencyCode}
                onChangeText={(currencyCode) =>
                  setServiceDraft({ ...serviceDraft, currencyCode })
                }
                autoCapitalize="characters"
              />
              <AppButton onPress={saveService} busy={busy}>
                {editingService ? "Update service" : "Save service"}
              </AppButton>
              <AppButton
                variant="secondary"
                onPress={() => {
                  setServiceDraft(null);
                  setEditingService(null);
                }}
                disabled={busy}
              >
                Cancel service
              </AppButton>
            </View>
          ) : (
            <AppButton
              variant="secondary"
              onPress={() => {
                setEditingService(null);
                setServiceDraft(initialServiceDraft());
              }}
            >
              Record service
            </AppButton>
          )}
          {services.isPending ? (
            <FeedbackState kind="loading" title="Loading services…" />
          ) : services.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load services"
              actionLabel="Try again"
              onAction={() => services.refetch()}
            />
          ) : services.data?.length ? (
            services.data.map((record) => (
              <View key={record.id} style={styles.section}>
                <Text style={{ color: colors.text }}>
                  {record.performed_on} · {record.service_type}
                  {record.odometer == null
                    ? ""
                    : ` · ${record.odometer.toLocaleString()} miles`}
                  {record.cost == null
                    ? ""
                    : ` · ${record.cost.toLocaleString()} ${record.currency_code ?? ""}`}
                </Text>
                <AppButton
                  variant="secondary"
                  onPress={() => {
                    setEditingService(record);
                    setServiceDraft(serviceDraftFromRecord(record));
                    setMessage("");
                  }}
                >
                  Edit {record.service_type}
                </AppButton>
              </View>
            ))
          ) : (
            <FeedbackState kind="empty" title="No service records yet" />
          )}
          <View style={styles.actions}>
            {servicePage > 0 ? (
              <AppButton
                variant="secondary"
                onPress={() => setServicePage(servicePage - 1)}
              >
                Previous services
              </AppButton>
            ) : null}
            {services.data?.length === 100 ? (
              <AppButton
                variant="secondary"
                onPress={() => setServicePage(servicePage + 1)}
              >
                More services
              </AppButton>
            ) : null}
          </View>
          <Text
            accessibilityRole="header"
            style={[styles.subheading, { color: colors.text }]}
          >
            Maintenance tasks
          </Text>
          <AppTextField
            label="New maintenance task"
            value={maintenanceTitle}
            onChangeText={setMaintenanceTitle}
          />
          <AppButton onPress={addMaintenanceTask} busy={busy}>
            Add maintenance task
          </AppButton>
          {linkedTasks.isPending ? (
            <FeedbackState kind="loading" title="Loading maintenance tasks…" />
          ) : linkedTasks.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load maintenance tasks"
              actionLabel="Try again"
              onAction={() => linkedTasks.refetch()}
            />
          ) : linkedTasks.data?.length ? (
            linkedTasks.data.map((task) => (
              <Text key={task.id} style={{ color: colors.text }}>
                {task.title} · {task.status}
              </Text>
            ))
          ) : (
            <FeedbackState kind="empty" title="No maintenance tasks yet" />
          )}
          <View style={styles.actions}>
            {taskPage > 0 ? (
              <AppButton
                variant="secondary"
                onPress={() => setTaskPage(taskPage - 1)}
              >
                Previous tasks
              </AppButton>
            ) : null}
            {linkedTasks.data?.length === 100 ? (
              <AppButton
                variant="secondary"
                onPress={() => setTaskPage(taskPage + 1)}
              >
                More tasks
              </AppButton>
            ) : null}
          </View>
          <AppButton
            variant="secondary"
            onPress={() => {
              setSelected(null);
              setHistoryPage(0);
              setServicePage(0);
              setTaskPage(0);
              setServiceDraft(null);
              setEditingService(null);
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
                  setServicePage(0);
                  setTaskPage(0);
                  setServiceDraft(null);
                  setEditingService(null);
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
