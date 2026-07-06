import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, radii, typography } from '../theme';
import { useProfile } from '../state/profile';
import { useUI } from '../state/ui';

/**
 * First-launch Terms of Service + Privacy acceptance. Full-screen modal
 * that must be accepted before the player reaches any playable surface.
 * Persists via profile.tosAcceptedAt (epoch ms).
 */
export function TosModal(): React.ReactElement {
  const acceptTos = useProfile((s) => s.acceptTos);
  const goToPrivacy = useUI((s) => s.goToPrivacy);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.crest}>
          <Text style={styles.crestGlyph}>🌙</Text>
        </View>
        <Text style={styles.title}>Welcome, apprentice.</Text>
        <Text style={styles.body}>
          Before you tend the moonlit garden, please accept our Terms of Use
          and confirm you’ve reviewed our Privacy Policy.
        </Text>

        <View style={styles.linkRow}>
          <Pressable onPress={goToPrivacy}>
            <Text style={styles.link}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.linkDot}>·</Text>
          <Pressable onPress={goToPrivacy}>
            <Text style={styles.link}>Privacy Policy</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.accept}
          onPress={() => acceptTos(Date.now())}
        >
          <Text style={styles.acceptLabel}>Accept</Text>
        </Pressable>
        <Text style={styles.fine}>
          By tapping Accept, you agree to be bound by the Terms and acknowledge
          our Privacy Policy. You must be 13 or older to play.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
  },
  crest: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.candlelight,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  crestGlyph: { fontSize: 32 },
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
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  link: {
    color: palette.candlelight,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  linkDot: { color: palette.parchmentDim },
  accept: {
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  acceptLabel: {
    color: palette.bgDeep,
    fontWeight: '800',
    fontSize: 16,
  },
  fine: {
    ...typography.small,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
  },
});
