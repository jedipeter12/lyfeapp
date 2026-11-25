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
const mockAddService = jest.fn();
const mockUpdateService = jest.fn();
const mockCreateTask = jest.fn();
let mockServiceRows: Record<string, unknown>[] = [];

jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: userId } } }),
}));
jest.mock("@/lib/query/entities", () => ({
  useEntityList: () => ({ data: [vehicle], isPending: false, isError: false }),
  useVehicleMileage: () => ({ data: [], isPending: false, isError: false }),
  useVehicleServices: () => ({
    data: mockServiceRows,
    isPending: false,
    isError: false,
  }),
  useVehicleTasks: () => ({ data: [], isPending: false, isError: false }),
  useCreateEntity: (table: string) => ({
    mutateAsync: table === "tasks" ? mockCreateTask : mockCreate,
  }),
  useUpdateEntity: () => ({ mutateAsync: mockUpdate }),
  useAddVehicleMileage: () => ({ mutateAsync: mockAddMileage }),
  useAddVehicleService: () => ({ mutateAsync: mockAddService }),
  useUpdateVehicleService: () => ({ mutateAsync: mockUpdateService }),
}));

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue(vehicle);
  mockUpdate.mockReset().mockResolvedValue(vehicle);
  mockAddMileage.mockReset().mockResolvedValue({});
  mockAddService.mockReset().mockResolvedValue({});
  mockUpdateService.mockReset().mockResolvedValue({});
  mockCreateTask.mockReset().mockResolvedValue({});
  mockServiceRows = [];
});

it("corrects an existing service record", async () => {
  const record = {
    id: "33333333-3333-4333-8333-333333333333",
    user_id: userId,
    vehicle_id: vehicle.id,
    service_type: "Oil",
    performed_on: "2026-11-24",
    odometer: 250,
    cost: 40,
    currency_code: "USD",
  };
  mockServiceRows = [record];
  const screen = await render(<VehiclesScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "2021 Example Sedan 100 miles" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Edit Oil" }));
  await fireEvent.changeText(screen.getByLabelText("Cost (optional)"), "42");
  await fireEvent.press(screen.getByRole("button", { name: "Update service" }));
  await waitFor(() =>
    expect(mockUpdateService).toHaveBeenCalledWith({
      id: record.id,
      input: {
        service_type: "Oil",
        performed_on: "2026-11-24",
        odometer: 250,
        cost: 42,
        currency_code: "USD",
      },
    }),
  );
});

it("records a service expense and links a maintenance task", async () => {
  const screen = await render(<VehiclesScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "2021 Example Sedan 100 miles" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Record service" }));
  await fireEvent.changeText(
    screen.getByLabelText("Service type"),
    " Oil change ",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Performed on (YYYY-MM-DD)"),
    "2026-11-24",
  );
  await fireEvent.changeText(screen.getByLabelText("Cost (optional)"), "45.25");
  await fireEvent.changeText(
    screen.getByLabelText("Currency code (optional)"),
    "usd",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save service" }));
  await waitFor(() =>
    expect(mockAddService).toHaveBeenCalledWith({
      service_type: "Oil change",
      performed_on: "2026-11-24",
      odometer: null,
      cost: 45.25,
      currency_code: "USD",
    }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("New maintenance task"),
    "Replace filter",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Add maintenance task" }),
  );
  await waitFor(() =>
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Replace filter",
        vehicle_id: vehicle.id,
        status: "pending",
      }),
    ),
  );
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
