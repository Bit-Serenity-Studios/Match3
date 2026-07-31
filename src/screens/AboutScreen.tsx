import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { HomeButton } from '../components/HomeButton';
import { LEVELS } from '../levels/catalog';
import { APP_VERSION, EXPO_SDK } from '../appMeta';

export function AboutScreen(): React.ReactElement {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>About</Text>
        <HomeButton />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Moonpetal Apothecary</Text>
        <Text style={styles.byline}>By Bit Serenity Studios</Text>
        <Text style={styles.version}>Version {APP_VERSION} · SDK {EXPO_SDK}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is this?</Text>
          <Text style={styles.body}>
            A cozy match-3 with a moonlit garden theme. Brew tinctures, tame
            companions, send them on tea-time expeditions, and upgrade
            your apothecary hub. {LEVELS.length} levels tuned by hand and
            verified by a headless simulator so every one is beatable
            without a booster.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <Text style={styles.body}>
            Design, engineering, and level tuning: Bit Serenity Studios.
            Match-3 engine built from scratch in TypeScript with a
            deterministic seeded RNG so every board is reproducible.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.body}>
            Trouble? Feedback? Reach out to support@bitserenity.studio.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acknowledgements</Text>
          <Text style={styles.body}>
            Built with Expo, React Native, Skia, Reanimated, and Zustand.
          </Text>
        </View>
      </ScrollView>
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
  title: { ...typography.h1, marginTop: spacing.md },
  byline: { ...typography.body, color: palette.parchmentDim, marginTop: spacing.xs },
  version: { ...typography.small, marginTop: spacing.xs },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h2, fontSize: 16, marginBottom: spacing.xs },
  body: { color: palette.parchmentDim, fontSize: 13, lineHeight: 20 },
});
