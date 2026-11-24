import { fireEvent, render, waitFor } from "@testing-library/react-native";
import VehiclesScreen from "../vehicles";

const userId = "11111111-1111-4111-8111-111111111111";
const vehicle = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: userId,
  year: 2021,
  make: "Example",
  model: "Sedan",
  vin: "AB12",
  current_mileage: 100,
};
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockAddMileage = jest.fn();

jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: userId } } }),
}));
jest.mock("@/lib/query/entities", () => ({
  useEntityList: () => ({ data: [vehicle], isPending: false, isError: false }),
  useVehicleMileage: () => ({ data: [], isPending: false, isError: false }),
  useCreateEntity: () => ({ mutateAsync: mockCreate }),
  useUpdateEntity: () => ({ mutateAsync: mockUpdate }),
  useAddVehicleMileage: () => ({ mutateAsync: mockAddMileage }),
}));

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue(vehicle);
  mockUpdate.mockReset().mockResolvedValue(vehicle);
  mockAddMileage.mockReset().mockResolvedValue({});
});

it("creates a normalized vehicle and edits its current mileage", async () => {
  const screen = await render(<VehiclesScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "New vehicle" }));
  await fireEvent.changeText(screen.getByLabelText("Year"), "2021");
  await fireEvent.changeText(screen.getByLabelText("Make"), " Example ");
  await fireEvent.changeText(screen.getByLabelText("Model"), "Sedan");
  await fireEvent.changeText(
    screen.getByLabelText("VIN (optional)"),
    " ab 12 ",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save vehicle" }));
  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith({
      year: 2021,
      make: "Example",
      model: "Sedan",
      vin: "AB12",
      current_mileage: null,
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Edit vehicle" }));
  await fireEvent.changeText(
    screen.getByLabelText("Current mileage (optional)"),
    "125",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save vehicle" }));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      id: vehicle.id,
      changes: {
        year: 2021,
        make: "Example",
        model: "Sedan",
        vin: "AB12",
        current_mileage: 125,
      },
    }),
  );
});

it("records mileage history for the selected vehicle", async () => {
  const screen = await render(<VehiclesScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "2021 Example Sedan 100 miles" }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("New mileage reading"),
    "250",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Record reading" }));
  await waitFor(() =>
    expect(mockAddMileage).toHaveBeenCalledWith({
      vehicleId: vehicle.id,
      odometer: 250,
      recorded_at: expect.any(String),
    }),
  );
});
