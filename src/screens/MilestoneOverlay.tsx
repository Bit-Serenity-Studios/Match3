import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, radii, typography } from '../theme';
import { WoodButton } from '../components/WoodButton';
import { click } from '../audio/click';

interface Props {
  glyph: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction(): void;
}

/**
 * A celebratory milestone modal. Used for one-off progression moments —
 * the "you finished the tutorial levels" hand-off, an endless-mode
 * kickoff card, etc. Distinct from the failure/continue overlay so it
 * never gets confused with monetization surface.
 */
export function MilestoneOverlay({
  glyph,
  title,
  body,
  actionLabel,
  onAction,
}: Props): React.ReactElement {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.crest}>
          <Text style={styles.crestGlyph}>{glyph}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <WoodButton
          label={actionLabel}
          onPress={click(onAction)}
          labelStyle={styles.actionLabel}
        />
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
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelight,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  crest: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.candlelightSoft,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  crestGlyph: { fontSize: 48 },
  title: {
    ...typography.h1,
    fontSize: 24,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: palette.parchment,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  action: {
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
  },
  actionLabel: {
    color: palette.bgDeep,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
});
