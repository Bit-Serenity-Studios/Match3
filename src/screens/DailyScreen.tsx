import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { WoodButton } from '../components/WoodButton';
import { MenuButton } from '../components/MenuButton';
import { RewardChips } from '../components/Currency';
import { useProfile } from '../state/profile';
import { useRetention } from '../state/retention';
import { useUI } from '../state/ui';
import {
  CALENDAR_REWARDS,
  startOfUTCDay,
} from '../retention/calendar';
import { track } from '../telemetry/logger';
import { click } from '../audio/click';
import { sfx } from '../audio/soundEffects';

/**
 * Daily rewards — 7-day escalating login calendar. Returning each day
 * escalates the reward; missing 2+ days resets the cycle.
 */
export function DailyScreen(): React.ReactElement {
  const goToHome = useUI((s) => s.goToHome);
  const cal = useRetention((s) => s.calendar);
  const idx = useRetention((s) => s.currentCalendarDayIndex(Date.now()));
  const canLogin = useRetention((s) => canClaim(s, Date.now()));
  const claimLogin = useRetention((s) => s.claimDailyLogin);
  const addCurrency = useProfile((s) => s.addCurrency);

  const doClaim = () => {
    const grants = claimLogin(Date.now());
    if (!grants) return;
    addCurrency({ coins: grants.coins, gems: grants.gems, embers: grants.embers });
    sfx('win');
    track('currency_spend', {
      currency: 'coins',
      amount: -(grants.coins ?? 0),
      reason: 'daily_login_reward',
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <MenuButton />
        <View style={styles.headerTitle}>
          <Text style={typography.h1}>Daily Rewards</Text>
          <Text style={typography.small}>Return every night.</Text>
        </View>
        <Pressable style={styles.backBtn} onPress={click(() => goToHome())}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>7-Day Ritual</Text>
        <View style={styles.calendar}>
          {CALENDAR_REWARDS.map((g, i) => {
            const claimed = i < idx || (i === idx && !canLogin);
            const today = i === idx;
            return (
              <View
                key={i}
                style={[
                  styles.day,
                  today && styles.dayToday,
                  claimed && styles.dayClaimed,
                ]}
              >
                <Text style={styles.dayNum}>Day {i + 1}</Text>
                <RewardChips
                  grants={{ coins: g.coins, embers: g.embers, gems: g.gems }}
                  size={12}
                  textStyle={styles.dayReward}
                  style={styles.dayRewardRow}
                />
              </View>
            );
          })}
        </View>
        <WoodButton
          label={canLogin ? `Claim day ${idx + 1}` : 'Come back tomorrow'}
          onPress={click(doClaim)}
          disabled={!canLogin}
          labelStyle={styles.claimLabel}
        />
        <Text style={styles.hint}>
          Completed cycles: {cal.completedCycles}. Miss a night and the ritual resets.
        </Text>
      </ScrollView>
    </View>
  );
}

function canClaim(s: ReturnType<typeof useRetention.getState>, now: number): boolean {
  const idx = s.currentCalendarDayIndex(now);
  const alreadyToday = startOfUTCDay(s.calendar.lastClaimedAt) === startOfUTCDay(now);
  if (alreadyToday) return false;
  return idx !== s.calendar.lastClaimedDayIndex || s.calendar.lastClaimedAt === 0;
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
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: { flex: 1 },
  backBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  backLabel: { color: palette.parchment, fontWeight: '600' },
  sectionTitle: { ...typography.h2, marginTop: spacing.md, marginBottom: spacing.sm },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  day: {
    flexBasis: '30%',
    padding: spacing.sm,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayToday: { borderColor: palette.candlelight, borderWidth: 2 },
  dayClaimed: { opacity: 0.4 },
  dayNum: { color: palette.parchment, fontSize: 12, fontWeight: '700' },
  dayReward: { color: palette.parchmentDim, fontSize: 11 },
  dayRewardRow: { marginTop: 4, justifyContent: 'center' },
  claimBtn: {
    marginTop: spacing.md,
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  claimLabel: { color: palette.bgDeep, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  hint: { color: palette.parchmentDim, fontSize: 12, marginTop: spacing.sm },
});
