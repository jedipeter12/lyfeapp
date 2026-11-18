import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { useProfile, useUpdateProfile } from "@/lib/query/entities";
import { OfflineWriteError } from "@/lib/supabase/repositories";
import { AppButton } from "@/components/ui/AppButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppTextField } from "@/components/ui/AppTextField";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { spacing, useAppTheme } from "@/theme";

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
  const { colors } = useAppTheme();

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
    <AppScreen scroll>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        Account
      </Text>
      <Text style={{ color: colors.muted }}>{session?.user.email ?? ""}</Text>
      {profile.isPending ? (
        <FeedbackState kind="loading" title="Loading profile…" />
      ) : profile.isError ? (
        <FeedbackState
          kind="error"
          title="Could not load profile"
          actionLabel="Try again"
          onAction={() => void profile.refetch()}
        />
      ) : (
        <>
          <AppTextField
            label="Display name"
            maxLength={120}
            value={displayName}
            onChangeText={(value) => {
              setDraft({ display_name: value, timezone });
            }}
          />
          <AppTextField
            label="Time zone"
            autoCapitalize="none"
            maxLength={100}
            value={timezone}
            onChangeText={(value) => {
              setDraft({ display_name: displayName, timezone: value });
            }}
          />
          <AppButton
            disabled={busy || !profile.data}
            busy={busy}
            onPress={save}
          >
            Save profile
          </AppButton>
        </>
      )}
      {message ? (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {message}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <AppButton disabled={busy} onPress={signOut} variant="secondary">
          Sign out
        </AppButton>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "700" },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
