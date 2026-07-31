import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, radii } from '../theme';
import { Icon, type IconName } from '../components/Icon';
import { useProfile } from '../state/profile';

interface Props {
  onDone(): void;
}

/**
 * Cold-boot splash. Runs a fake progress bar over ~1.2s while giving
 * AsyncStorage-persisted stores a beat to hydrate. Auto-fires `onDone`
 * when the bar hits 100%.
 *
 * The bar advances at a bounded rate rather than tying to real hydration —
 * the perceived "loading" is what matters here for the first-launch feel.
 */
const SPLASH_MS = 1200;

// Decorative CC0 glyphs that drift on a slow loop.
const DECORATIONS: Array<{ icon: IconName; x: number; y: number }> = [
  { icon: 'herb', x: 12, y: 15 },
  { icon: 'sparkle', x: 78, y: 12 },
  { icon: 'moon', x: 88, y: 60 },
  { icon: 'mushroom', x: 8, y: 55 },
  { icon: 'star', x: 55, y: 8 },
  { icon: 'candle', x: 68, y: 78 },
  { icon: 'moonpetalDecor', x: 20, y: 82 },
  { icon: 'droplet', x: 85, y: 30 },
];

export function SplashScreen({ onDone }: Props): React.ReactElement {
  const reduceMotion = useProfile.getState().reduceMotion;
  useEffect(() => {
    if (reduceMotion) {
      const id = setTimeout(onDone, 40);
      return () => clearTimeout(id);
    }
  }, [reduceMotion, onDone]);
  const [pct, setPct] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const driftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(driftAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ),
    ]).start();

    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - started;
      const raw = Math.min(1, elapsed / SPLASH_MS);
      // ease-out for a friendlier bar curve
      const eased = 1 - Math.pow(1 - raw, 2);
      setPct(eased);
      if (raw >= 1) {
        clearInterval(id);
        setTimeout(onDone, 120);
      }
    }, 50);
    return () => clearInterval(id);
  }, [driftAnim, opacityAnim, onDone, scaleAnim]);

  const drift = driftAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {DECORATIONS.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.decor,
            {
              left: `${d.x}%`,
              top: `${d.y}%`,
              transform: [{ translateY: drift }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Icon name={d.icon} size={26} />
        </Animated.View>
      ))}

      <Animated.View
        style={[
          styles.hero,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.crest}>
          <Icon name="moon" size={66} />
        </View>
        <Text style={styles.title}>Moonpetal</Text>
        <Text style={styles.titleSub}>Apothecary</Text>
      </Animated.View>

      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
      </View>

      <Text style={styles.tagline}>Between the moon and the kettle.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl * 2,
  },
  crest: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelight,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: palette.candlelight,
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 8,
  },
  crestGlyph: { fontSize: 60 },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: palette.candlelight,
    letterSpacing: 2,
  },
  titleSub: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.parchment,
    letterSpacing: 3,
  },
  progressWrap: {
    position: 'absolute',
    bottom: spacing.xxl * 3,
    width: '68%',
    alignItems: 'center',
  },
  progressBar: {
    height: 14,
    width: '100%',
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.candlelight,
  },
  pct: {
    marginTop: spacing.xs,
    color: palette.candlelight,
    fontWeight: '800',
    fontSize: 14,
  },
  tagline: {
    position: 'absolute',
    bottom: spacing.xxl,
    color: palette.parchmentDim,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
