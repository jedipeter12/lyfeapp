import { fireEvent, render, waitFor } from "@testing-library/react-native";
import PetsScreen from "../pets";

const userId = "11111111-1111-4111-8111-111111111111";
const pet = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: userId,
  name: "Milo",
  species: "cat",
  breed: null,
  birth_date: null,
  notes: null,
  created_at: "2026-11-17T12:00:00+00:00",
  updated_at: "2026-11-17T12:00:00+00:00",
};
const mockList = jest.fn();
const mockWeights = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockAddWeight = jest.fn();
const mockUpdateWeight = jest.fn();
const mockCare = jest.fn();
const mockSaveCare = jest.fn();
const mockCreateTask = jest.fn();

jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: userId } } }),
}));
jest.mock("@/lib/query/entities", () => ({
  useEntityList: (...args: unknown[]) => mockList(...args),
  usePetWeights: (...args: unknown[]) => mockWeights(...args),
  usePetCare: (...args: unknown[]) => mockCare(...args),
  useSavePetCare: () => ({ mutateAsync: mockSaveCare }),
  useCreateEntity: (table: string) => ({
    mutateAsync: table === "tasks" ? mockCreateTask : mockCreate,
  }),
  useUpdateEntity: () => ({ mutateAsync: mockUpdate }),
  useAddPetWeight: () => ({ mutateAsync: mockAddWeight }),
  useUpdatePetWeight: () => ({ mutateAsync: mockUpdateWeight }),
}));

beforeEach(() => {
  mockList.mockReset().mockReturnValue({ data: [] });
  mockWeights.mockReset().mockReturnValue({ data: [] });
  mockCare.mockReset().mockReturnValue({ data: [] });
  mockSaveCare.mockReset().mockResolvedValue({});
  mockCreateTask.mockReset().mockResolvedValue({});
  mockCreate.mockReset().mockResolvedValue(pet);
  mockUpdate.mockReset().mockResolvedValue(pet);
  mockAddWeight.mockReset().mockResolvedValue({});
  mockUpdateWeight.mockReset().mockResolvedValue({});
});

it("shows an empty state, creates a pet, and adds a weight", async () => {
  const screen = await render(<PetsScreen />);
  expect(screen.getByText("No pets yet")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "New pet" }));
  await fireEvent.changeText(screen.getByLabelText("Name"), " Milo ");
  await fireEvent.changeText(screen.getByLabelText("Species"), "cat");
  await fireEvent.press(screen.getByRole("button", { name: "Save pet" }));
  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Milo", species: "cat" }),
    ),
  );
  expect(screen.getByText("No weights yet")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Add weight" }));
  await fireEvent.changeText(screen.getByLabelText("Weight (kg)"), "4.25");
  await fireEvent.press(screen.getByRole("button", { name: "Save weight" }));
  await waitFor(() =>
    expect(mockAddWeight).toHaveBeenCalledWith(
      expect.objectContaining({
        weight_kg: 4.25,
        measured_at: expect.any(String),
      }),
    ),
  );
});

it("edits an existing pet and prevents invalid weight submission", async () => {
  mockList.mockReturnValue({ data: [pet] });
  const screen = await render(<PetsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Milo · cat" }));
  await fireEvent.press(screen.getByRole("button", { name: "Edit pet" }));
  await fireEvent.changeText(
    screen.getByLabelText("Breed (optional)"),
    "Tabby",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save pet" }));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      id: pet.id,
      changes: expect.objectContaining({ breed: "Tabby" }),
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add weight" }));
  await fireEvent.changeText(screen.getByLabelText("Weight (kg)"), "0");
  await fireEvent.press(screen.getByRole("button", { name: "Save weight" }));
  expect(
    screen.getByText("Enter a positive weight in kilograms."),
  ).toBeTruthy();
  expect(mockAddWeight).not.toHaveBeenCalled();
});

it("shows weight history and corrects an existing entry", async () => {
  const entry = {
    id: "55555555-5555-4555-8555-555555555555",
    user_id: userId,
    pet_id: pet.id,
    weight_kg: 4.25,
    measured_at: "2026-11-17T12:00:00+00:00",
  };
  mockList.mockReturnValue({ data: [pet] });
  mockWeights.mockReturnValue({ data: [entry] });
  const screen = await render(<PetsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Milo · cat" }));
  expect(screen.getByText(/4.25 kg/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Edit weight" }));
  await fireEvent.changeText(screen.getByLabelText("Weight (kg)"), "4.5");
  await fireEvent.press(screen.getByRole("button", { name: "Save weight" }));
  await waitFor(() =>
    expect(mockUpdateWeight).toHaveBeenCalledWith({
      id: entry.id,
      changes: expect.objectContaining({ weight_kg: 4.5 }),
    }),
  );
});

it("records health history and creates a pet-linked vaccination due task", async () => {
  mockList.mockReturnValue({ data: [pet] });
  mockCare.mockImplementation((kind: string) => ({
    data:
      kind === "vaccinations"
        ? [
            {
              id: "55555555-5555-4555-8555-555555555555",
              user_id: userId,
              pet_id: pet.id,
              name: "Rabies",
              administered_on: "2026-11-01",
              due_on: "2027-11-01",
            },
          ]
        : [],
  }));
  const screen = await render(<PetsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Milo · cat" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Add health event" }),
  );
  await fireEvent.changeText(screen.getByLabelText("Event type"), "Checkup");
  await fireEvent.changeText(
    screen.getByLabelText("Event date (YYYY-MM-DD)"),
    "2026-11-01",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Save health event" }),
  );
  await waitFor(() =>
    expect(mockSaveCare).toHaveBeenCalledWith({
      id: undefined,
      input: expect.objectContaining({ event_type: "Checkup" }),
    }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Create due task for Rabies" }),
  );
  await waitFor(() =>
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Milo: Rabies vaccination",
        pet_id: pet.id,
        due_at: expect.any(String),
      }),
    ),
  );
});

it("edits medication history and adds a vaccination", async () => {
  mockList.mockReturnValue({ data: [pet] });
  mockCare.mockImplementation((kind: string) => ({
    data:
      kind === "medications"
        ? [
            {
              id: "66666666-6666-4666-8666-666666666666",
              user_id: userId,
              pet_id: pet.id,
              name: "Example medicine",
              dosage_text: "1 tablet",
              start_date: "2026-11-01",
              end_date: "2026-11-30",
            },
          ]
        : [],
  }));
  const screen = await render(<PetsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Milo · cat" }));
  await fireEvent.press(
    screen.getByRole("button", {
      name: "Edit Example medicine medication",
    }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Dosage (optional)"),
    "2 tablets",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Save medication" }),
  );
  await waitFor(() =>
    expect(mockSaveCare).toHaveBeenCalledWith({
      id: "66666666-6666-4666-8666-666666666666",
      input: expect.objectContaining({ dosage_text: "2 tablets" }),
    }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Add vaccination" }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Vaccination name"),
    "Rabies",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Next due date (YYYY-MM-DD, optional)"),
    "2027-11-01",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Save vaccination" }),
  );
  await waitFor(() =>
    expect(mockSaveCare).toHaveBeenCalledWith({
      id: undefined,
      input: expect.objectContaining({ name: "Rabies", due_on: "2027-11-01" }),
    }),
  );
});
