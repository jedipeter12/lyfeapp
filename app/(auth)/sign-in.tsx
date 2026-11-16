import { Link } from "expo-router";
import { useColorScheme } from "react-native";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function SignInScreen() {
  const linkColor = useColorScheme() === "dark" ? "#93C5FD" : "#1D4ED8";
  return (
    <PlaceholderScreen
      title="Sign in"
      description="Account sign-in is coming in a later ticket."
    >
      <Link
        href="/home"
        accessibilityLabel="Return to Home preview"
        style={{ color: linkColor }}
      >
        Return to Home preview
      </Link>
    </PlaceholderScreen>
  );
}
