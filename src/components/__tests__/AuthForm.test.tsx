import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AuthForm } from "../AuthForm";
import { supabase } from "@/lib/supabase/client";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{children}</Text>;
  },
}));
jest.mock("@/lib/supabase/AuthProvider", () => ({
  useAuth: () => ({ configured: true }),
}));
jest.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { signInWithPassword: jest.fn(), signUp: jest.fn() } },
}));

const signIn = supabase!.auth.signInWithPassword as jest.Mock;

beforeEach(() => signIn.mockReset());

test("submits email and password and reports an authentication error", async () => {
  signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  const screen = await render(<AuthForm mode="sign-in" />);
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    " person@example.test ",
  );
  await fireEvent.changeText(screen.getByLabelText("Password"), "password123");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => {
    expect(signIn).toHaveBeenCalledWith({
      email: "person@example.test",
      password: "password123",
    });
    expect(screen.getByText("Invalid login credentials")).toBeTruthy();
  });
});
