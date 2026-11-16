import { useState } from "react";
import { Link, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/AuthProvider";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { configured } = useAuth();
  const signingUp = mode === "sign-up";
  const dark = useColorScheme() === "dark";
  const foreground = dark ? "#F9FAFB" : "#18212F";
  const inputStyle = [
    styles.input,
    { color: foreground, borderColor: dark ? "#9CA3AF" : "#737373" },
  ];

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
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: dark ? "#101827" : "#FFFFFF" },
      ]}
    >
      <View style={styles.form}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: foreground }]}
        >
          {signingUp ? "Create account" : "Sign in"}
        </Text>
        {!configured ? (
          <Text accessibilityRole="alert" style={{ color: foreground }}>
            Supabase is not configured. See docs/DEVELOPMENT.md.
          </Text>
        ) : null}
        <Text style={[styles.label, { color: foreground }]}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
        />
        <Text style={[styles.label, { color: foreground }]}>Password</Text>
        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete={signingUp ? "new-password" : "current-password"}
          secureTextEntry
          textContentType={signingUp ? "newPassword" : "password"}
          value={password}
          onChangeText={setPassword}
          style={inputStyle}
        />
        {message ? (
          <Text
            accessibilityRole="alert"
            style={[styles.message, { color: foreground }]}
          >
            {message}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={!configured || busy}
          onPress={submit}
          style={styles.button}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {signingUp ? "Create account" : "Sign in"}
            </Text>
          )}
        </Pressable>
        <Link
          href={(signingUp ? "/sign-in" : "/sign-up") as Href}
          style={[styles.link, { color: dark ? "#93C5FD" : "#1D4ED8" }]}
        >
          {signingUp
            ? "Have an account? Sign in"
            : "Need an account? Create one"}
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  form: { gap: 10, width: "100%", maxWidth: 420, alignSelf: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 18 },
  label: { fontSize: 16, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  message: { fontSize: 15, marginVertical: 8 },
  button: {
    backgroundColor: "#1D4ED8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { fontSize: 16, marginTop: 16, textAlign: "center" },
});
