import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { click } from '../audio/click';

interface Props {
  onDone(): void;
}

/**
 * First-time-user tutorial. Three steps, shown once. Tracked in profile
 * via `tutorialSeen`. Skip button on every step so returning players
 * (who reset progress) can dismiss it instantly.
 */
const STEPS = [
  {
    title: 'Welcome, apprentice.',
    body: 'The moon has fallen into your cauldron. Swap glowing ingredients to make matches of three or more.',
    action: 'Continue',
  },
  {
    title: 'Match to brew.',
    body: 'Drag a tile onto its neighbor to swap them. If it forms a line of three, they clear and their essence rises into the flask above.',
    action: 'Got it',
  },
  {
    title: 'Complete the recipe.',
    body: 'Watch the objectives at the top. Meet them before you run out of moves and you brew tonight’s tincture.',
    action: 'Let’s brew',
  },
] as const;

export function TutorialOverlay({ onDone }: Props): React.ReactElement {
  const [step, setStep] = useState(0);
  const cur = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.pips}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.pip, i === step && styles.pipActive]}
            />
          ))}
        </View>
        <Text style={styles.title}>{cur.title}</Text>
        <Text style={styles.body}>{cur.body}</Text>
        <Pressable
          style={styles.primary}
          onPress={click(() => (isLast ? onDone() : setStep(step + 1)))}
        >
          <Text style={styles.primaryLabel}>{cur.action}</Text>
        </Pressable>
        <Pressable style={styles.skip} onPress={click(onDone)}>
          <Text style={styles.skipLabel}>Skip tutorial</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 100,
  },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    padding: spacing.xl,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 380,
  },
  pips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  pip: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.bgSurface2,
  },
  pipActive: { backgroundColor: palette.candlelight },
  title: {
    ...typography.h1,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: palette.parchment,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primary: {
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  primaryLabel: { color: palette.bgDeep, fontWeight: '700', fontSize: 16 },
  skip: { padding: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  skipLabel: { color: palette.parchmentDim, fontSize: 12 },
});
