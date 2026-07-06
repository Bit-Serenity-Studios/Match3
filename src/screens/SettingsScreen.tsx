import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { useUI } from '../state/ui';

export function SettingsScreen(): React.ReactElement {
  const goToMenu = useUI((s) => s.goToMenu);
  const goToPrivacy = useUI((s) => s.goToPrivacy);
  const sound = useProfile((s) => s.soundEnabled);
  const haptics = useProfile((s) => s.hapticsEnabled);
  const setSound = useProfile((s) => s.setSoundEnabled);
  const setHaptics = useProfile((s) => s.setHapticsEnabled);
  const resetProgress = useProfile((s) => s.resetProgress);
  const highestUnlocked = useProfile((s) => s.highestUnlocked);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>Settings</Text>
        <Pressable style={styles.backBtn} onPress={goToMenu}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>Audio & Feedback</Text>
        <Row label="Sound effects">
          <Switch value={sound} onValueChange={setSound} />
        </Row>
        <Row label="Haptics">
          <Switch value={haptics} onValueChange={setHaptics} />
        </Row>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <Pressable style={styles.linkRow} onPress={goToPrivacy}>
          <Text style={styles.linkLabel}>Privacy Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Progress</Text>
          <Text style={styles.cardValue}>
            {highestUnlocked} level{highestUnlocked === 1 ? '' : 's'} cleared
          </Text>
          <Pressable
            style={[styles.dangerBtn, confirmReset && styles.dangerBtnActive]}
            onPress={() => {
              if (confirmReset) {
                resetProgress();
                setConfirmReset(false);
                goToMenu();
              } else {
                setConfirmReset(true);
              }
            }}
          >
            <Text style={styles.dangerLabel}>
              {confirmReset ? 'Tap again to confirm' : 'Reset all progress'}
            </Text>
          </Pressable>
          {confirmReset && (
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setConfirmReset(false)}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
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
  sectionTitle: {
    ...typography.h2,
    fontSize: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: palette.parchmentDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowLabel: { color: palette.parchment, fontSize: 15 },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  linkLabel: { color: palette.parchment, fontSize: 15 },
  chevron: { color: palette.parchmentDim, fontSize: 20 },
  card: {
    padding: spacing.md,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  cardLabel: { color: palette.parchmentDim, fontSize: 12 },
  cardValue: { color: palette.parchment, fontSize: 16, marginTop: spacing.xs, marginBottom: spacing.md },
  dangerBtn: {
    backgroundColor: palette.bgSurface2,
    borderColor: palette.danger,
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  dangerBtnActive: { backgroundColor: palette.danger },
  dangerLabel: { color: palette.parchment, fontWeight: '600' },
  cancelBtn: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  cancelLabel: { color: palette.parchmentDim },
});
