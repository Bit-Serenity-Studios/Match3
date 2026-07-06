import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useUI } from '../state/ui';

/**
 * Privacy policy — required for App Store / Google Play submission when
 * the app collects any analytics (Phase 5) or offers IAP (Phase 4).
 *
 * Text is authored here as a placeholder; a legal pass replaces the
 * final wording before shipping to production. Sections match the
 * standard app-store privacy nutrition labels.
 */
export function PrivacyScreen(): React.ReactElement {
  const goToMenu = useUI((s) => s.goToMenu);
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>Privacy Policy</Text>
        <Pressable style={styles.backBtn} onPress={goToMenu}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>Last updated: July 2026</Text>

        <Section title="Overview">
          Moonpetal Apothecary (“the game”, “we”, “us”) is a single-player
          cozy match-3 game. We aim to collect as little personal data as
          the game needs to function, keep what we do collect on your
          device, and give you meaningful controls over what leaves it.
        </Section>

        <Section title="Data we collect on your device">
          The game stores the following on your device only:
          progress and level history, your currencies and cosmetic
          preferences, opt-in status for notifications, purchase history
          for restoring your entitlements, and gameplay analytics that
          help us balance levels (attempts per win, fail margins, session
          length). This data is kept in your device’s local storage and
          is not transmitted to any server by default.
        </Section>

        <Section title="Data we may share with third parties">
          If you make a purchase, our payment provider (App Store or
          Google Play) processes the transaction under their own privacy
          policy. If you watch a rewarded ad, our ad partner may receive
          a device advertising identifier (which you can reset or limit
          in your device settings) to display and measure the ad. We do
          not share your gameplay data with advertisers.
        </Section>

        <Section title="Analytics">
          When enabled in a future build, aggregated gameplay analytics
          may be sent to us in de-identified form to help us tune
          difficulty and content. You will be able to opt out at any
          time from Settings. In the current build, analytics stay on
          your device and are visible only through the developer dev
          panel.
        </Section>

        <Section title="Push notifications">
          If you opt in, we schedule local notifications on your device
          (life refilled, expedition complete, streak reminders, and a
          three-day lapsed check-in). These are scheduled and delivered
          entirely by your device — nothing is sent from our servers.
          You may revoke permission at any time in your OS settings.
        </Section>

        <Section title="Children">
          The game is designed to be safe for all ages. We do not
          knowingly collect personal information from children under 13.
          If you believe a child has provided us with personal data,
          please contact us and we will delete it.
        </Section>

        <Section title="Your controls">
          You can reset all local data at any time by uninstalling the
          game, or via Settings → Reset progress. Opting out of
          notifications is available in your OS. Ad tracking can be
          limited via Settings → Privacy on iOS or the ad ID controls
          on Android.
        </Section>

        <Section title="Contact">
          Questions about this policy? Reach out to Bit Serenity Studios
          at support@bitserenity.studio.
        </Section>

        <Text style={styles.updated}>
          This policy may be updated as the game gains new features.
          Material changes will be surfaced in-app before they take
          effect.
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgDeep,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  backLabel: { color: palette.parchment, fontWeight: '600' },
  body: { paddingBottom: 60 },
  updated: { color: palette.parchmentDim, fontSize: 12, marginBottom: spacing.md, fontStyle: 'italic' },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    ...typography.h2,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    color: palette.parchmentDim,
    fontSize: 13,
    lineHeight: 20,
  },
});
