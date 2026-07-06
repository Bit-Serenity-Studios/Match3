import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { useRetention } from '../state/retention';
import { useUI } from '../state/ui';
import {
  CALENDAR_CYCLE_DAYS,
  CALENDAR_REWARDS,
} from '../retention/calendar';
import { levelForDay } from '../retention/dailyBrew';
import { startOfUTCDay } from '../retention/calendar';
import { track } from '../telemetry/logger';

/**
 * The retention hub: 7-day calendar + daily brew entry. Accessible from
 * the hub's "Daily" button. Sits alongside Store / Pass in the top bar.
 */
export function DailyScreen(): React.ReactElement {
  const goToHub = useUI((s) => s.goToHub);
  const cal = useRetention((s) => s.calendar);
  const idx = useRetention((s) => s.currentCalendarDayIndex(Date.now()));
  const canLogin = useRetention((s) => canClaim(s, Date.now()));
  const claimLogin = useRetention((s) => s.claimDailyLogin);
  const canBrew = useRetention((s) => s.canClaimBrew(Date.now()));
  const brew = useRetention((s) => s.brew);
  const addCurrency = useProfile((s) => s.addCurrency);

  const todayLevel = useMemo(
    () => levelForDay(startOfUTCDay(Date.now())),
    [],
  );

  const doClaim = () => {
    const grants = claimLogin(Date.now());
    if (!grants) return;
    addCurrency({ coins: grants.coins, gems: grants.gems, embers: grants.embers });
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
        <View>
          <Text style={typography.h1}>Daily</Text>
          <Text style={typography.small}>Return every day.</Text>
        </View>
        <Pressable style={styles.backBtn} onPress={() => goToHub()}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>7-day login</Text>
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
                <Text style={styles.dayReward}>
                  {[g.coins && `${g.coins}🪙`, g.embers && `${g.embers}🔥`, g.gems && `${g.gems}⭐`]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
              </View>
            );
          })}
        </View>
        <Pressable
          style={[styles.claimBtn, !canLogin && styles.disabled]}
          disabled={!canLogin}
          onPress={doClaim}
        >
          <Text style={styles.claimLabel}>
            {canLogin ? `Claim day ${idx + 1}` : 'Come back tomorrow'}
          </Text>
        </Pressable>
        <Text style={styles.hint}>
          Completed cycles: {cal.completedCycles}. Miss a day and it resets.
        </Text>

        <Text style={styles.sectionTitle}>Today's Brew</Text>
        <View style={styles.brewCard}>
          <Text style={typography.h2}>{todayLevel.id}</Text>
          <Text style={typography.small}>
            {todayLevel.archetype} · same seed for every player today
          </Text>
          <Text style={[typography.small, { marginTop: spacing.sm }]}>
            Win to earn 200🪙 + 15🔥 + 10⭐. Streak: {brew.streak}
          </Text>
          <Pressable
            style={[styles.claimBtn, !canBrew && styles.disabled]}
            disabled={!canBrew}
            onPress={() => {
              // Deep-linking into the actual Daily Brew is deferred; for
              // now the entry point exists and the reward flow lives in
              // the retention store. A full "play daily brew" screen is
              // Phase 6.5 polish.
            }}
          >
            <Text style={styles.claimLabel}>
              {canBrew ? 'Play Daily Brew' : 'Come back tomorrow'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function canClaim(s: ReturnType<typeof useRetention.getState>, now: number): boolean {
  // Wrapper — the store exposes a method, but Zustand selectors want a
  // plain callback that reads from state, not a bound method.
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
  dayReward: { color: palette.parchmentDim, fontSize: 11, marginTop: 2 },
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
  brewCard: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radii.md,
  },
});
