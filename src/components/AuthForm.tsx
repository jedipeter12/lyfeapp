import { useState } from "react";
import { Link, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "./ui/AppButton";
import { AppScreen } from "./ui/AppScreen";
import { AppTextField } from "./ui/AppTextField";
import { spacing, useAppTheme } from "@/theme";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/AuthProvider";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { configured } = useAuth();
  const signingUp = mode === "sign-up";
  const { colors } = useAppTheme();

  async function submit() {
    if (!supabase || busy) return;
    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = signingUp
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) setMessage(result.error.message);
      else if (signingUp && !result.data.session)
        setMessage("Check your email to confirm your account, then sign in.");
    } catch {
      setMessage("Could not reach the account service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen centered scroll>
      <View style={styles.form}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {signingUp ? "Create account" : "Sign in"}
        </Text>
        {!configured ? (
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            Supabase is not configured. See docs/DEVELOPMENT.md.
          </Text>
        ) : null}
        <AppTextField
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <AppTextField
          label="Password"
          autoCapitalize="none"
          autoComplete={signingUp ? "new-password" : "current-password"}
          secureTextEntry
          textContentType={signingUp ? "newPassword" : "password"}
          value={password}
          onChangeText={setPassword}
        />
        {message ? (
          <Text
            accessibilityRole="alert"
            style={[styles.message, { color: colors.text }]}
          >
            {message}
          </Text>
        ) : null}
        <AppButton disabled={!configured} busy={busy} onPress={submit}>
          {signingUp ? "Create account" : "Sign in"}
        </AppButton>
        <Link
          href={(signingUp ? "/sign-in" : "/sign-up") as Href}
          style={[styles.link, { color: colors.primary }]}
        >
          {signingUp
            ? "Have an account? Sign in"
            : "Need an account? Create one"}
        </Link>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, width: "100%", maxWidth: 420, alignSelf: "center" },
  title: { fontSize: 30, fontWeight: "700", marginBottom: spacing.lg },
  message: { fontSize: 15 },
  link: { fontSize: 16, paddingVertical: spacing.md, textAlign: "center" },
});
