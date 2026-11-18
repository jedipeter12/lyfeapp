import { useState } from "react";
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
import { useProfile, useUpdateProfile } from "@/lib/query/entities";
import { OfflineWriteError } from "@/lib/supabase/repositories";

export default function AccountScreen() {
  const { session } = useAuth();
  const [draft, setDraft] = useState<{
    display_name: string;
    timezone: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const userId = session?.user.id ?? "";
  const profile = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);
  const displayName = draft?.display_name ?? profile.data?.display_name ?? "";
  const timezone = draft?.timezone ?? profile.data?.timezone ?? "UTC";
  const dark = useColorScheme() === "dark";
  const foreground = dark ? "#F9FAFB" : "#18212F";
  const inputStyle = [
    styles.input,
    { color: foreground, borderColor: dark ? "#9CA3AF" : "#737373" },
  ];

  async function save() {
    if (
      !supabase ||
      !session ||
      !profile.data ||
      busy ||
      updateProfile.isPending
    )
      return;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone.trim() });
    } catch {
      setMessage("Enter a valid time zone, such as America/Chicago.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        timezone: timezone.trim(),
      });
      setDraft(null);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(
        error instanceof OfflineWriteError
          ? error.message
          : "Could not save profile. Try again.",
      );
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
          onChangeText={(value) => {
            setDraft({ display_name: value, timezone });
          }}
          style={inputStyle}
        />
        <Text style={[styles.label, { color: foreground }]}>Time zone</Text>
        <TextInput
          accessibilityLabel="Time zone"
          autoCapitalize="none"
          maxLength={100}
          value={timezone}
          onChangeText={(value) => {
            setDraft({ display_name: displayName, timezone: value });
          }}
          style={inputStyle}
        />
        {profile.isError ? (
          <Text accessibilityRole="alert" style={{ color: foreground }}>
            Could not load profile.
          </Text>
        ) : null}
        {message ? (
          <Text accessibilityRole="alert" style={{ color: foreground }}>
            {message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !profile.data}
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
