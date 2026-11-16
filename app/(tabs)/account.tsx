import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/AuthProvider";

export default function AccountScreen() {
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dark = useColorScheme() === "dark";
  const foreground = dark ? "#F9FAFB" : "#18212F";
  const inputStyle = [
    styles.input,
    { color: foreground, borderColor: dark ? "#9CA3AF" : "#737373" },
  ];

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    supabase
      .from("profiles")
      .select("display_name,timezone")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage("Could not load profile.");
        else {
          setDisplayName(data.display_name ?? "");
          setTimezone(data.timezone);
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  async function save() {
    if (!supabase || !session || busy) return;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone.trim() });
    } catch {
      setMessage("Enter a valid time zone, such as America/Chicago.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), timezone: timezone.trim() })
        .eq("user_id", session.user.id);
      setMessage(error ? "Could not save profile." : "Profile saved.");
    } catch {
      setMessage("Could not reach the account service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setMessage("Could not sign out. Try again.");
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: foreground }]}
        >
          Account
        </Text>
        <Text style={{ color: foreground }}>{session?.user.email ?? ""}</Text>
        <Text style={[styles.label, { color: foreground }]}>Display name</Text>
        <TextInput
          accessibilityLabel="Display name"
          maxLength={120}
          value={displayName}
          onChangeText={setDisplayName}
          style={inputStyle}
        />
        <Text style={[styles.label, { color: foreground }]}>Time zone</Text>
        <TextInput
          accessibilityLabel="Time zone"
          autoCapitalize="none"
          maxLength={100}
          value={timezone}
          onChangeText={setTimezone}
          style={inputStyle}
        />
        {message ? (
          <Text accessibilityRole="alert" style={{ color: foreground }}>
            {message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={save}
            style={styles.button}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save profile</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={signOut}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 12, padding: 24 },
  title: { fontSize: 28, fontWeight: "700" },
  label: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  actions: { gap: 12, marginTop: 16 },
  button: {
    backgroundColor: "#1D4ED8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
