import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { PlaceholderScreen } from "../PlaceholderScreen";

describe("PlaceholderScreen", () => {
  it("exposes its title as a header and renders its description and children", async () => {
    const screen = await render(
      <PlaceholderScreen
        title="Tasks"
        description="Your tasks will appear here."
      >
        <Text>Preview action</Text>
      </PlaceholderScreen>,
    );

    expect(screen.getByRole("header", { name: "Tasks" })).toBeTruthy();
    expect(screen.getByText("Your tasks will appear here.")).toBeTruthy();
    expect(screen.getByText("Preview action")).toBeTruthy();
  });
});
