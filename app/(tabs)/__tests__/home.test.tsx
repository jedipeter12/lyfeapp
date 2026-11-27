import { fireEvent, render, waitFor } from "@testing-library/react-native";
import HomeScreen from "../home";

const userId = "11111111-1111-4111-8111-111111111111";
const mockSetEnabled = jest.fn();
const mockPush = jest.fn();
const mockDashboard = jest.fn();
const mockPreferences = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: userId } } }),
}));
jest.mock("@/lib/query/dashboard", () => ({
  useDashboard: () => mockDashboard(),
  useModulePreferences: () => mockPreferences(),
  useSetModuleEnabled: () => ({
    mutateAsync: mockSetEnabled,
    isPending: false,
  }),
}));

beforeEach(() => {
  mockSetEnabled.mockReset().mockResolvedValue({});
  mockPush.mockReset();
  mockDashboard.mockReset().mockReturnValue({
    data: {
      tasks: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Renew registration",
          due_at: "2027-05-01T14:00:00.000Z",
        },
      ],
      reminders: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          title: "Renew registration",
          at: "2027-04-30T14:00:00.000Z",
        },
      ],
      recent: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          module: "pets",
          title: "Milo: 4.2 kg",
          at: "2027-04-29T14:00:00.000Z",
        },
      ],
    },
  });
  mockPreferences.mockReset().mockReturnValue({ data: [] });
});

it("shows the dashboard and saves a module preference", async () => {
  const screen = await render(<HomeScreen />);
  expect(screen.getByText("Upcoming tasks")).toBeTruthy();
  expect(screen.getAllByText("Renew registration")).toHaveLength(2);
  expect(screen.getByText("Milo: 4.2 kg")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Open tasks" }));
  expect(mockPush).toHaveBeenCalledWith("/tasks");
  await fireEvent(screen.getByLabelText("Pets enabled"), "valueChange", false);
  await waitFor(() =>
    expect(mockSetEnabled).toHaveBeenCalledWith({
      module: "pets",
      enabled: false,
    }),
  );
});

it("hides disabled module content and provides retry on load errors", async () => {
  mockPreferences.mockReturnValue({
    data: [
      { module_type: "tasks", enabled: false },
      { module_type: "pets", enabled: false },
    ],
  });
  const screen = await render(<HomeScreen />);
  expect(screen.queryByText("Upcoming tasks")).toBeNull();
  expect(screen.queryByText("Reminders")).toBeNull();
  expect(screen.queryByText("Milo: 4.2 kg")).toBeNull();
  const refetch = jest.fn();
  mockDashboard.mockReturnValue({ isError: true, refetch });
  await screen.rerender(<HomeScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(refetch).toHaveBeenCalled();
});
