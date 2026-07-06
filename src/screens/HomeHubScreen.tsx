import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { useUI } from '../state/ui';
import { ShellFrame } from './shell/ShellFrame';
import { LEVELS } from '../levels/catalog';
import { click } from '../audio/click';

/**
 * The home landing screen. Structure inspired by the classic
 * competitive match-3 home layout — big single PLAY button as the primary
 * CTA, a "Next Unlock" progress bar up top, a small "Learn the Basics"
 * tutorial trigger in a card, and a secondary card for the online mode.
 *
 * Kept in our moonlit aesthetic — no purple, no mascot art copied.
 */
export function HomeHubScreen(): React.ReactElement {
  const goToGame = useUI((s) => s.goToGame);
  const goToMoonrise = useUI((s) => s.goToMoonrise);
  const goToDaily = useUI((s) => s.goToDaily);
  const currentLevelIndex = useProfile((s) => s.currentLevelIndex);
  const highest = useProfile((s) => s.highestUnlocked);
  const tutorialSeen = useProfile((s) => s.tutorialSeen);
  const markTutorialUnseen = useProfile((s) => s.markTutorialSeen);
  const setTutorialSeen = (v: boolean) => {
    // Bypass the setter for the on-demand replay: writing directly via
    // setState-style access. We just clear the flag so GameScreen shows
    // the overlay again.
    useProfile.setState({ tutorialSeen: v });
    void markTutorialUnseen;
  };

  const nextUnlock = useMemo(() => computeNextUnlock(highest), [highest]);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const startBasics = () => {
    setTutorialSeen(false);
    goToGame();
  };

  return (
    <ShellFrame>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Next unlock progress bar */}
        <View style={styles.unlockBar}>
          <View style={styles.unlockTop}>
            <Text style={styles.trophy}>🏆</Text>
            <View style={styles.unlockBarTrack}>
              <View
                style={[
                  styles.unlockBarFill,
                  { width: `${nextUnlock.pct * 100}%` },
                ]}
              />
              <Text style={styles.unlockBarText}>
                {nextUnlock.current} / {nextUnlock.target}
              </Text>
            </View>
            <View style={styles.unlockReward}>
              <Text style={styles.unlockRewardGlyph}>{nextUnlock.rewardGlyph}</Text>
            </View>
          </View>
          <Text style={styles.unlockLabel}>
            {nextUnlock.remaining > 0
              ? `Win ${nextUnlock.remaining} more ${nextUnlock.remaining === 1 ? 'level' : 'levels'} — ${nextUnlock.rewardName}`
              : `${nextUnlock.rewardName} unlocked!`}
          </Text>
        </View>

        <View style={styles.stage}>
          {/* Left card — Learn the Basics (tutorial trigger) */}
          <View style={styles.leftCol}>
            <Pressable style={styles.miniCard} onPress={click(startBasics)}>
              <Text style={styles.miniCardGlyph}>📜</Text>
              <Text style={styles.miniCardTitle}>
                Learn the{'\n'}Basics
              </Text>
            </Pressable>
            <Pressable
              style={[styles.miniCard, { marginTop: spacing.sm }]}
              onPress={click(goToDaily)}
            >
              <Text style={styles.miniCardGlyph}>☕</Text>
              <Text style={styles.miniCardTitle}>Daily{'\n'}Brew</Text>
            </Pressable>
          </View>

          {/* Center hero + Play button */}
          <View style={styles.centerCol}>
            <View style={styles.heroCrest}>
              <Text style={styles.heroGlyph}>🌙</Text>
            </View>
            <Text style={styles.heroTitle}>
              {highest === 0 ? 'Ready to brew?' : `Level ${currentLevelIndex + 1}`}
            </Text>
            <Text style={styles.heroSub}>Solo Journey</Text>

            <Animated.View style={[styles.playBtnWrap, { transform: [{ scale: pulse }] }]}>
              <Pressable style={styles.playBtn} onPress={click(goToGame)}>
                <Text style={styles.playLabel}>PLAY</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>

        {/* Secondary — online mode */}
        <Pressable style={styles.onlineCard} onPress={click(goToMoonrise)}>
          <View style={styles.onlineIcon}>
            <Text style={styles.onlineGlyph}>⚔️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.onlineTitle}>Moonrise Duel</Text>
            <Text style={styles.onlineSub}>Compete for moonstones · 1v1 online</Text>
          </View>
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>Beta</Text>
          </View>
        </Pressable>

        {!tutorialSeen && highest === 0 && (
          <Text style={styles.firstHint}>Tap PLAY to begin your first brew.</Text>
        )}
      </ScrollView>
    </ShellFrame>
  );
}

interface NextUnlock {
  current: number;
  target: number;
  pct: number;
  remaining: number;
  rewardName: string;
  rewardGlyph: string;
}

/** What does the player unlock next? Uses the 60-level campaign as the
 *  ladder — every 5 levels is a milestone. */
function computeNextUnlock(highest: number): NextUnlock {
  const MILESTONES: Array<{ at: number; name: string; glyph: string }> = [
    { at: 3, name: 'Apothecary Hub', glyph: '🏛️' },
    { at: 6, name: 'Companions', glyph: '🐾' },
    { at: 9, name: 'Expeditions', glyph: '🗺️' },
    { at: 15, name: 'Battle Pass', glyph: '⭐' },
    { at: 20, name: 'Advanced Recipes', glyph: '🧪' },
    { at: 30, name: 'Legendary Companions', glyph: '👑' },
    { at: 45, name: 'Master Brewer', glyph: '🏆' },
    { at: 60, name: 'Grand Cauldron', glyph: '🎃' },
  ];
  const next = MILESTONES.find((m) => highest < m.at) ?? MILESTONES[MILESTONES.length - 1]!;
  const prev = [...MILESTONES].reverse().find((m) => m.at <= highest);
  const floor = prev?.at ?? 0;
  const target = next.at;
  const current = Math.min(highest, target);
  const pct = target === floor ? 1 : (current - floor) / (target - floor);
  return {
    current,
    target,
    pct: Math.max(0, Math.min(1, pct)),
    remaining: Math.max(0, target - current),
    rewardName: next.name,
    rewardGlyph: next.glyph,
  };
}

const styles = StyleSheet.create({
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  unlockBar: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  unlockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trophy: { fontSize: 22 },
  unlockBarTrack: {
    flex: 1,
    height: 26,
    backgroundColor: palette.bgSurface2,
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  unlockBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.candlelight,
  },
  unlockBarText: {
    textAlign: 'center',
    color: palette.bgDeep,
    fontWeight: '800',
    fontSize: 13,
  },
  unlockReward: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.candlelight,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockRewardGlyph: { fontSize: 22 },
  unlockLabel: {
    ...typography.small,
    marginTop: 6,
    textAlign: 'center',
    color: palette.parchmentDim,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  leftCol: {
    width: 96,
    marginRight: spacing.sm,
  },
  miniCard: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  miniCardGlyph: { fontSize: 28, marginBottom: 4 },
  miniCardTitle: {
    color: palette.parchment,
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  centerCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroCrest: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: palette.candlelight,
    shadowOpacity: 0.4,
    shadowRadius: 22,
  },
  heroGlyph: { fontSize: 66 },
  heroTitle: {
    ...typography.h1,
    fontSize: 20,
  },
  heroSub: {
    ...typography.small,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  playBtnWrap: {
    shadowColor: palette.candlelight,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playBtn: {
    backgroundColor: palette.candlelight,
    paddingHorizontal: spacing.xxl + spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: palette.candlelightSoft,
  },
  playLabel: {
    color: palette.bgDeep,
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 2,
  },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.purple,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  onlineIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineGlyph: { fontSize: 22 },
  onlineTitle: {
    color: palette.parchment,
    fontWeight: '700',
    fontSize: 16,
  },
  onlineSub: {
    ...typography.small,
    marginTop: 2,
  },
  betaBadge: {
    backgroundColor: palette.purple,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  betaText: {
    color: palette.parchment,
    fontSize: 10,
    fontWeight: '800',
  },
  firstHint: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: palette.candlelight,
    fontStyle: 'italic',
    fontSize: 13,
  },
});

// LEVELS import guard so the file bundles even if the catalog reshapes.
void LEVELS;
