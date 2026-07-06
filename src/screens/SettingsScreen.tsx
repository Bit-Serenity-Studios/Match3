import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { useUI } from '../state/ui';
import { click } from '../audio/click';
import { sfx } from '../audio/soundEffects';
import { TRACKS, currentTrack, nextTrack, prevTrack, playTrack } from '../audio/musicPlayer';

/**
 * Settings — audio (music + SFX split with volumes), accessibility
 * (reduce motion, larger text/targets, high contrast, colorblind mode),
 * feedback (haptics), and data (reset progress + privacy policy link).
 *
 * The track picker under Music lets the player skip through the 10
 * generated ambient loops.
 */
export function SettingsScreen(): React.ReactElement {
  const goToMenu = useUI((s) => s.goToMenu);
  const goToPrivacy = useUI((s) => s.goToPrivacy);
  const goToAbout = useUI((s) => s.goToAbout);

  const musicEnabled = useProfile((s) => s.musicEnabled);
  const musicVolume = useProfile((s) => s.musicVolume);
  const sfxEnabled = useProfile((s) => s.sfxEnabled);
  const sfxVolume = useProfile((s) => s.sfxVolume);
  const haptics = useProfile((s) => s.hapticsEnabled);
  const reduceMotion = useProfile((s) => s.reduceMotion);
  const largerText = useProfile((s) => s.largerText);
  const largerTapTargets = useProfile((s) => s.largerTapTargets);
  const highContrast = useProfile((s) => s.highContrast);
  const colorblindMode = useProfile((s) => s.colorblindMode);
  const resetProgress = useProfile((s) => s.resetProgress);
  const highestUnlocked = useProfile((s) => s.highestUnlocked);

  const setMusicEnabled = useProfile((s) => s.setMusicEnabled);
  const setMusicVolume = useProfile((s) => s.setMusicVolume);
  const setSfxEnabled = useProfile((s) => s.setSfxEnabled);
  const setSfxVolume = useProfile((s) => s.setSfxVolume);
  const setHaptics = useProfile((s) => s.setHapticsEnabled);
  const setReduceMotion = useProfile((s) => s.setReduceMotion);
  const setLargerText = useProfile((s) => s.setLargerText);
  const setLargerTapTargets = useProfile((s) => s.setLargerTapTargets);
  const setHighContrast = useProfile((s) => s.setHighContrast);
  const setColorblindMode = useProfile((s) => s.setColorblindMode);

  const [confirmReset, setConfirmReset] = useState(false);
  const [tickTock, setTickTock] = useState(0); // re-render on track skip
  const track = currentTrack();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>Settings</Text>
        <Pressable style={styles.backBtn} onPress={click(goToMenu)}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ─── AUDIO ─── */}
        <Text style={styles.sectionTitle}>Audio</Text>

        <Row label="Music">
          <Switch value={musicEnabled} onValueChange={setMusicEnabled} />
        </Row>
        <Slider label="Music volume" value={musicVolume} onChange={setMusicVolume} />

        {musicEnabled && (
          <View style={styles.trackCard}>
            <Text style={styles.trackLabel}>Now playing</Text>
            <Text style={styles.trackTitle}>{track?.title ?? '—'}</Text>
            <Text style={styles.trackMood}>{track?.mood ?? ''}</Text>
            <View style={styles.trackControls}>
              <Pressable
                style={styles.trackBtn}
                onPress={click(() => {
                  prevTrack();
                  setTickTock((n) => n + 1);
                })}
              >
                <Text style={styles.trackBtnLabel}>‹ Prev</Text>
              </Pressable>
              <Pressable
                style={styles.trackBtn}
                onPress={click(() => {
                  nextTrack();
                  setTickTock((n) => n + 1);
                })}
              >
                <Text style={styles.trackBtnLabel}>Next ›</Text>
              </Pressable>
            </View>
            <Text style={styles.trackHint}>10 tracks · loops until you switch</Text>
          </View>
        )}

        <Row label="Sound effects">
          <Switch
            value={sfxEnabled}
            onValueChange={(v) => {
              setSfxEnabled(v);
              if (v) sfx('click');
            }}
          />
        </Row>
        <Slider label="SFX volume" value={sfxVolume} onChange={setSfxVolume} onRelease={() => sfx('match')} />

        {/* ─── ACCESSIBILITY ─── */}
        <Text style={styles.sectionTitle}>Accessibility</Text>
        <Row label="Reduce motion" sub="Skips the splash, tile glides, and button pulses">
          <Switch value={reduceMotion} onValueChange={setReduceMotion} />
        </Row>
        <Row label="Larger text" sub="Bumps every label up ~15%">
          <Switch value={largerText} onValueChange={setLargerText} />
        </Row>
        <Row label="Larger tap targets" sub="Grows buttons and tiles for easier tapping">
          <Switch value={largerTapTargets} onValueChange={setLargerTapTargets} />
        </Row>
        <Row label="High contrast" sub="Bolder borders and stronger text against the background">
          <Switch value={highContrast} onValueChange={setHighContrast} />
        </Row>

        <Text style={styles.subSectionTitle}>Colorblind mode</Text>
        <View style={styles.chipRow}>
          {(['off', 'deuteranopia', 'protanopia', 'tritanopia'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, colorblindMode === m && styles.chipActive]}
              onPress={click(() => setColorblindMode(m))}
            >
              <Text
                style={[
                  styles.chipLabel,
                  colorblindMode === m && styles.chipLabelActive,
                ]}
              >
                {m === 'off' ? 'Off' : m[0]!.toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ─── FEEDBACK ─── */}
        <Text style={styles.sectionTitle}>Feedback</Text>
        <Row label="Haptics" sub="Small vibrations on matches and taps">
          <Switch value={haptics} onValueChange={setHaptics} />
        </Row>

        {/* ─── ABOUT / PRIVACY ─── */}
        <Text style={styles.sectionTitle}>Info</Text>
        <Pressable style={styles.linkRow} onPress={click(goToPrivacy)}>
          <Text style={styles.linkLabel}>Privacy Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={click(goToAbout)}>
          <Text style={styles.linkLabel}>About Moonpetal</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* ─── DATA ─── */}
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Progress</Text>
          <Text style={styles.cardValue}>
            {highestUnlocked} level{highestUnlocked === 1 ? '' : 's'} cleared
          </Text>
          <Pressable
            style={[styles.dangerBtn, confirmReset && styles.dangerBtnActive]}
            onPress={click(() => {
              if (confirmReset) {
                resetProgress();
                setConfirmReset(false);
                goToMenu();
              } else {
                setConfirmReset(true);
              }
            })}
          >
            <Text style={styles.dangerLabel}>
              {confirmReset ? 'Tap again to confirm' : 'Reset all progress'}
            </Text>
          </Pressable>
          {confirmReset && (
            <Pressable style={styles.cancelBtn} onPress={click(() => setConfirmReset(false))}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          )}
        </View>
        {/* Force re-render so the current-track label updates after skip. */}
        <View style={{ height: tickTock === -1 ? 1 : 0 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

function Slider({
  label,
  value,
  onChange,
  onRelease,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onRelease?: () => void;
}) {
  // React Native doesn't ship a Slider — build a 5-step chip slider.
  const steps = [0, 0.25, 0.5, 0.75, 1];
  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.sliderRow}>
        {steps.map((v) => {
          const active = value >= v - 0.001;
          return (
            <Pressable
              key={v}
              style={[styles.sliderCell, active && styles.sliderCellActive]}
              onPress={click(() => {
                onChange(v);
                onRelease?.();
              })}
            />
          );
        })}
      </View>
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
  subSectionTitle: {
    ...typography.small,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  rowLabel: { color: palette.parchment, fontSize: 15, fontWeight: '600' },
  rowSub: { color: palette.parchmentDim, fontSize: 11, marginTop: 2 },
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
    marginBottom: spacing.sm,
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
  sliderWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sliderLabel: { color: palette.parchment, fontSize: 13, fontWeight: '600' },
  sliderValue: { color: palette.candlelight, fontSize: 13, fontWeight: '700' },
  sliderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sliderCell: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.border,
    borderWidth: 1,
  },
  sliderCellActive: {
    backgroundColor: palette.candlelight,
    borderColor: palette.candlelight,
  },
  trackCard: {
    padding: spacing.md,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  trackLabel: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trackTitle: {
    ...typography.h2,
    fontSize: 18,
    marginTop: 2,
  },
  trackMood: { ...typography.small, marginTop: 2 },
  trackControls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  trackBtn: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  trackBtnLabel: { color: palette.parchment, fontWeight: '700' },
  trackHint: { ...typography.small, marginTop: spacing.sm, textAlign: 'center' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
  },
  chipActive: {
    borderColor: palette.candlelight,
    backgroundColor: palette.bgSurface2,
  },
  chipLabel: { color: palette.parchmentDim, fontSize: 12, fontWeight: '600' },
  chipLabelActive: { color: palette.candlelight, fontWeight: '800' },
});

// TRACKS import guard so the module bundles even if callers rearrange.
void TRACKS;
void playTrack;
