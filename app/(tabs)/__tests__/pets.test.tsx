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

jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: userId } } }),
}));
jest.mock("@/lib/query/entities", () => ({
  useEntityList: (...args: unknown[]) => mockList(...args),
  usePetWeights: (...args: unknown[]) => mockWeights(...args),
  useCreateEntity: () => ({ mutateAsync: mockCreate }),
  useUpdateEntity: () => ({ mutateAsync: mockUpdate }),
  useAddPetWeight: () => ({ mutateAsync: mockAddWeight }),
  useUpdatePetWeight: () => ({ mutateAsync: mockUpdateWeight }),
}));

beforeEach(() => {
  mockList.mockReset().mockReturnValue({ data: [] });
  mockWeights.mockReset().mockReturnValue({ data: [] });
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
