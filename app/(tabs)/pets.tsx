import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppTextField } from "@/components/ui/AppTextField";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { PetCareSection } from "@/features/pets/PetCareSection";
import {
  initialPetDraft,
  initialWeightDraft,
  petInputFromDraft,
  weightInputFromDraft,
  type PetDraft,
  type WeightDraft,
} from "@/features/pets/petForm";
import {
  useAddPetWeight,
  useCreateEntity,
  useEntityList,
  usePetWeights,
  useUpdateEntity,
  useUpdatePetWeight,
} from "@/lib/query/entities";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import type { EntityRow, PetWeightEntry } from "@/schemas/entities";
import { spacing, useAppTheme } from "@/theme";

export default function PetsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const { colors } = useAppTheme();
  const [page, setPage] = useState(0);
  const [pet, setPet] = useState<EntityRow<"pets"> | null>(null);
  const [draft, setDraft] = useState<PetDraft | null>(null);
  const [weightDraft, setWeightDraft] = useState<WeightDraft | null>(null);
  const [editingWeight, setEditingWeight] = useState<PetWeightEntry | null>(
    null,
  );
  const [weightPage, setWeightPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pets = useEntityList("pets", userId, page);
  const weights = usePetWeights(userId, pet?.id, weightPage);
  const createPet = useCreateEntity("pets", userId);
  const updatePet = useUpdateEntity("pets", userId);
  const addWeight = useAddPetWeight(userId, pet?.id ?? "");
  const updateWeight = useUpdatePetWeight(userId, pet?.id ?? "");

  async function savePet() {
    if (!draft || busy) return;
    let input: ReturnType<typeof petInputFromDraft>;
    try {
      input = petInputFromDraft(draft);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Check pet details.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const saved = pet
        ? await updatePet.mutateAsync({ id: pet.id, changes: input })
        : await createPet.mutateAsync(input);
      setPet(saved);
      setDraft(null);
      setPage(0);
      setMessage("Pet saved.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not save pet. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveWeight() {
    if (!pet || !weightDraft || busy) return;
    let input: ReturnType<typeof weightInputFromDraft>;
    try {
      input = weightInputFromDraft(weightDraft, editingWeight?.measured_at);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check weight details.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (editingWeight)
        await updateWeight.mutateAsync({
          id: editingWeight.id,
          changes: input,
        });
      else await addWeight.mutateAsync(input);
      setWeightDraft(null);
      setEditingWeight(null);
      setWeightPage(0);
      setMessage("Weight saved.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not save weight. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen scroll>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        Pets
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
            style={[styles.heading, { color: colors.text }]}
          >
            {pet ? `Edit ${pet.name}` : "New pet"}
          </Text>
          <AppTextField
            label="Name"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
          />
          <AppTextField
            label="Species"
            value={draft.species}
            onChangeText={(species) => setDraft({ ...draft, species })}
          />
          <AppTextField
            label="Breed (optional)"
            value={draft.breed}
            onChangeText={(breed) => setDraft({ ...draft, breed })}
          />
          <AppTextField
            label="Birth date (YYYY-MM-DD, optional)"
            value={draft.birthDate}
            keyboardType="numbers-and-punctuation"
            onChangeText={(birthDate) => setDraft({ ...draft, birthDate })}
          />
          <AppTextField
            label="Notes (optional)"
            value={draft.notes}
            multiline
            onChangeText={(notes) => setDraft({ ...draft, notes })}
          />
          <AppButton onPress={() => void savePet()} busy={busy}>
            Save pet
          </AppButton>
          <AppButton
            variant="secondary"
            onPress={() => {
              setDraft(null);
              setMessage("");
            }}
          >
            Cancel
          </AppButton>
        </View>
      ) : pet ? (
        <View style={styles.section}>
          <AppButton
            variant="secondary"
            onPress={() => {
              setPet(null);
              setWeightDraft(null);
              setMessage("");
            }}
          >
            All pets
          </AppButton>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            {pet.name}
          </Text>
          <Text style={{ color: colors.text }}>Species: {pet.species}</Text>
          {pet.breed ? (
            <Text style={{ color: colors.text }}>Breed: {pet.breed}</Text>
          ) : null}
          {pet.birth_date ? (
            <Text style={{ color: colors.text }}>Born: {pet.birth_date}</Text>
          ) : null}
          {pet.notes ? (
            <Text style={{ color: colors.text }}>Notes: {pet.notes}</Text>
          ) : null}
          <AppButton
            variant="secondary"
            onPress={() => {
              setDraft(initialPetDraft(pet));
              setMessage("");
            }}
          >
            Edit pet
          </AppButton>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            Weight history
          </Text>
          {weightDraft ? (
            <View style={styles.section}>
              <Text style={{ color: colors.text }}>
                {editingWeight ? "Edit weight" : "Add weight"}
              </Text>
              <AppTextField
                label="Weight (kg)"
                value={weightDraft.weight}
                keyboardType="decimal-pad"
                onChangeText={(weight) =>
                  setWeightDraft({ ...weightDraft, weight })
                }
              />
              <AppTextField
                label="Measured date (YYYY-MM-DD)"
                value={weightDraft.measuredDate}
                keyboardType="numbers-and-punctuation"
                onChangeText={(measuredDate) =>
                  setWeightDraft({ ...weightDraft, measuredDate })
                }
              />
              <AppButton onPress={() => void saveWeight()} busy={busy}>
                Save weight
              </AppButton>
              <AppButton
                variant="secondary"
                onPress={() => {
                  setWeightDraft(null);
                  setEditingWeight(null);
                  setMessage("");
                }}
              >
                Cancel
              </AppButton>
            </View>
          ) : (
            <AppButton
              onPress={() => {
                setEditingWeight(null);
                setWeightDraft(initialWeightDraft());
                setMessage("");
              }}
            >
              Add weight
            </AppButton>
          )}
          {weights.isPending ? (
            <FeedbackState kind="loading" title="Loading weights…" />
          ) : weights.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load weights"
              actionLabel="Retry"
              onAction={() => void weights.refetch()}
            />
          ) : weights.data?.length ? (
            <>
              {weights.data.map((entry) => (
                <View key={entry.id} style={styles.entry}>
                  <Text style={{ color: colors.text }}>
                    {new Date(entry.measured_at).toLocaleDateString()} ·{" "}
                    {entry.weight_kg} kg
                  </Text>
                  <AppButton
                    variant="secondary"
                    onPress={() => {
                      setEditingWeight(entry);
                      setWeightDraft(initialWeightDraft(entry));
                      setMessage("");
                    }}
                  >
                    Edit weight
                  </AppButton>
                </View>
              ))}
              <View style={styles.paging}>
                {weightPage > 0 ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => setWeightPage(weightPage - 1)}
                  >
                    Newer weights
                  </AppButton>
                ) : null}
                {weights.data.length === 100 ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => setWeightPage(weightPage + 1)}
                  >
                    Older weights
                  </AppButton>
                ) : null}
              </View>
            </>
          ) : (
            <FeedbackState
              kind="empty"
              title="No weights yet"
              description="Add a weight in kilograms to start this pet’s history."
            />
          )}
          <PetCareSection
            key={`${pet.id}-health`}
            kind="health"
            userId={userId}
            petId={pet.id}
            petName={pet.name}
          />
          <PetCareSection
            key={`${pet.id}-medications`}
            kind="medications"
            userId={userId}
            petId={pet.id}
            petName={pet.name}
          />
          <PetCareSection
            key={`${pet.id}-vaccinations`}
            kind="vaccinations"
            userId={userId}
            petId={pet.id}
            petName={pet.name}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <AppButton
            onPress={() => {
              setDraft(initialPetDraft());
              setMessage("");
            }}
          >
            New pet
          </AppButton>
          {pets.isPending ? (
            <FeedbackState kind="loading" title="Loading pets…" />
          ) : pets.isError ? (
            <FeedbackState
              kind="error"
              title="Could not load pets"
              actionLabel="Retry"
              onAction={() => void pets.refetch()}
            />
          ) : pets.data?.length ? (
            <>
              {pets.data.map((item) => (
                <AppButton
                  key={item.id}
                  variant="secondary"
                  onPress={() => {
                    setPet(item);
                    setWeightPage(0);
                    setMessage("");
                  }}
                >
                  {item.name} · {item.species}
                </AppButton>
              ))}
              <View style={styles.paging}>
                {page > 0 ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => setPage(page - 1)}
                  >
                    Previous pets
                  </AppButton>
                ) : null}
                {pets.data.length === 100 ? (
                  <AppButton
                    variant="secondary"
                    onPress={() => setPage(page + 1)}
                  >
                    More pets
                  </AppButton>
                ) : null}
              </View>
            </>
          ) : (
            <FeedbackState
              kind="empty"
              title="No pets yet"
              description="Create a pet profile to start tracking weight."
            />
          )}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700" },
  heading: { fontSize: 22, fontWeight: "700" },
  section: { gap: spacing.md },
  entry: { gap: spacing.sm, paddingVertical: spacing.sm },
  paging: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
