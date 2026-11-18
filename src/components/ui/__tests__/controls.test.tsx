import { fireEvent, render } from "@testing-library/react-native";
import { AppButton } from "../AppButton";
import { AppTextField } from "../AppTextField";
import { FeedbackState } from "../FeedbackState";

test("buttons expose their state and ignore presses while disabled", async () => {
  const onPress = jest.fn();
  const screen = await render(
    <AppButton onPress={onPress} disabled>
      Save
    </AppButton>,
  );
  const button = screen.getByRole("button", { name: "Save" });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

test("text fields and feedback expose accessible labels and errors", async () => {
  const screen = await render(
    <>
      <AppTextField label="Display name" error="Required" />
      <FeedbackState kind="error" title="Could not load profile" />
    </>,
  );
  expect(screen.getByLabelText("Display name")).toBeTruthy();
  expect(screen.getByRole("alert", { name: "Required" })).toBeTruthy();
  expect(
    screen.getByRole("alert", { name: "Could not load profile" }),
  ).toBeTruthy();
});
