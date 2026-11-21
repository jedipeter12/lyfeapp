import { fireEvent, render, waitFor } from "@testing-library/react-native";
import TasksScreen from "../tasks";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockList = jest.fn();
const mockRules = jest.fn();
const mockCompleteRecurring = jest.fn();
const mockSaveRule = jest.fn();
const task = {
  id: "44444444-4444-4444-8444-444444444444",
  user_id: "11111111-1111-4111-8111-111111111111",
  title: "Renew registration",
  description: null,
  status: "pending",
  priority: "medium",
  due_at: null,
  completed_at: null,
  deleted_at: null,
  pet_id: null,
  vehicle_id: null,
  created_at: "2026-11-17T12:00:00+00:00",
  updated_at: "2026-11-17T12:00:00+00:00",
};

jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({
    session: { user: { id: "11111111-1111-4111-8111-111111111111" } },
  }),
}));
jest.mock("@/lib/query/entities", () => ({
  useTasksByCompletion: (...args: unknown[]) => mockList(...args),
  useEntity: () => ({ data: null }),
  useEntityList: (table: string) => ({
    data:
      table === "vehicles"
        ? [
            {
              id: "55555555-5555-4555-8555-555555555555",
              year: 2020,
              make: "Example",
              model: "Car",
            },
          ]
        : [],
  }),
  useCreateEntity: () => ({ mutateAsync: mockCreate }),
  useUpdateEntity: () => ({ mutateAsync: mockUpdate }),
  useTaskRecurrenceRules: () => mockRules(),
  useTaskOccurrenceHistory: () => ({ data: [], isPending: false }),
  useSaveTaskRecurrenceRule: () => ({ mutateAsync: mockSaveRule }),
  useCompleteRecurringTask: () => ({ mutateAsync: mockCompleteRecurring }),
}));

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue(task);
  mockUpdate.mockReset().mockResolvedValue(task);
  mockList.mockReset().mockReturnValue({ data: [task] });
  mockRules
    .mockReset()
    .mockReturnValue({ data: [], isPending: false, isError: false });
  mockCompleteRecurring.mockReset().mockResolvedValue({});
  mockSaveRule.mockReset().mockResolvedValue({});
});

it("completes a recurring occurrence through the atomic mutation and shows history", async () => {
  const recurringTask = { ...task, due_at: "2027-05-01T14:00:00.000Z" };
  const rule = {
    id: "66666666-6666-4666-8666-666666666666",
    user_id: task.user_id,
    task_id: task.id,
    frequency: "monthly",
    interval: 1,
    weekdays: null,
    timezone: "America/Chicago",
    end_at: null,
    anchor_local_date: "2027-05-01",
    anchor_local_time: "09:00",
  };
  mockList.mockReturnValue({ data: [recurringTask] });
  mockRules.mockReturnValue({ data: [rule], isPending: false, isError: false });
  const screen = await render(<TasksScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Complete occurrence" }),
  );
  await waitFor(() =>
    expect(mockCompleteRecurring).toHaveBeenCalledWith({
      task: recurringTask,
      rule,
    }),
  );
  expect(mockUpdate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "History" }));
  expect(screen.getByText("No completed occurrences")).toBeTruthy();
});

it("creates a linked task and submits completion through the task mutation", async () => {
  const screen = await render(<TasksScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "New task" }));
  await fireEvent.changeText(screen.getByLabelText("Title"), "  Wash car  ");
  await fireEvent.press(
    screen.getByRole("button", { name: "Vehicle: 2020 Example Car" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save task" }));
  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Wash car",
        status: "pending",
        vehicle_id: "55555555-5555-4555-8555-555555555555",
        pet_id: null,
      }),
    ),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Complete" }));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      id: task.id,
      changes: { status: "completed", completed_at: expect.any(String) },
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "completed" }));
  expect(mockList).toHaveBeenLastCalledWith(task.user_id, "completed", 0);
});
