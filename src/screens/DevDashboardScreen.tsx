import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useUI } from '../state/ui';
import { getAnalytics } from '../telemetry/analytics';
import { funnel, levelStats, meanSessionDurationMs } from '../telemetry/aggregate';
import { APS_TARGETS } from '../../tools/simulator/runner';
import type { TelemetryEvent } from '../telemetry/types';
import type { LevelArchetype } from '../engine/types';

/**
 * Hidden dev dashboard reached by long-pressing the version tag on the hub.
 * Companion to the Phase 2 simulator: shows per-level APS and fail margins
 * *from real play*, plus funnel counters. Never expose in a shipped build
 * unless FEATURE_FLAGS gate this — for now it's dev-only.
 */
export function DevDashboardScreen() {
  const goToHub = useUI((s) => s.goToHub);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const a = getAnalytics();
    a.allEvents().then(setEvents);
  }, [refreshTick]);

  const stats = useMemo(() => levelStats(events), [events]);
  const f = useMemo(() => funnel(events), [events]);
  const meanSession = useMemo(() => meanSessionDurationMs(events), [events]);

  const onExport = async () => {
    const json = await getAnalytics().exportJson();
    try {
      await Share.share({ message: json.slice(0, 20000) }); // trim for share sheet
      setFlash('Exported');
    } catch {
      setFlash('Share dismissed');
    }
    setTimeout(() => setFlash(null), 1500);
  };

  const onClear = async () => {
    await getAnalytics().clear();
    setRefreshTick((n) => n + 1);
    setFlash('Cleared');
    setTimeout(() => setFlash(null), 1200);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Dev Dashboard</Text>
          <Text style={typography.small}>Live tuning · from real play</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={() => goToHub()}>
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>
      </View>

      {flash && (
        <View style={styles.flash}>
          <Text style={[typography.body, { color: palette.parchment, textAlign: 'center' }]}>
            {flash}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Section title="Funnel">
          <Row label="Sessions" value={f.sessions} />
          <Row label="Mean session" value={formatMs(meanSession)} />
          <Row label="Level starts" value={f.levelStarts} />
          <Row label="Wins / Losses" value={`${f.levelWins} / ${f.levelLosses}`} />
          <Row label="Store opens" value={f.storeOpens} />
          <Row
            label="Offers shown / purchased"
            value={`${f.offersShown} / ${f.offersPurchased}`}
          />
          <Row
            label="Ads requested / completed"
            value={`${f.adsRequested} / ${f.adsCompleted}`}
          />
          <Row label="Gacha pulls" value={f.gachaPulls} />
          <Row
            label="Expeditions started / claimed"
            value={`${f.expeditionsStarted} / ${f.expeditionsClaimed}`}
          />
        </Section>

        <Section title={`Per-level APS (${stats.length} tracked)`}>
          {stats.length === 0 && (
            <Text style={typography.small}>
              No level events yet. Play a level to populate.
            </Text>
          )}
          {stats.map((s) => {
            const target = APS_TARGETS[s.archetype as LevelArchetype];
            const inBand =
              target &&
              s.aps >= target.min &&
              s.aps <= target.max;
            return (
              <View key={s.levelId} style={styles.statCard}>
                <View style={styles.rowBetween}>
                  <Text style={typography.h2}>{s.levelId}</Text>
                  <Text
                    style={[
                      typography.h2,
                      { color: inBand ? palette.emerald : palette.danger },
                    ]}
                  >
                    APS {Number.isFinite(s.aps) ? s.aps.toFixed(2) : '∞'}
                  </Text>
                </View>
                <Text style={typography.small}>
                  {s.archetype} · target {target ? `${target.min}-${target.max}` : '—'}
                </Text>
                <Text style={typography.small}>
                  {s.starts} starts · {s.wins} wins · {s.losses} losses ·{' '}
                  {s.continuePurchases} continues
                </Text>
                <Text style={typography.small}>
                  ~moves-remaining on win: {s.medianMovesRemainingOnWin.toFixed(1)}
                </Text>
                <Text style={typography.small}>
                  median fail margin: {s.medianFailMarginPerObjective.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </Section>

        <View style={styles.footer}>
          <Pressable style={styles.actionBtn} onPress={onExport}>
            <Text style={styles.actionLabel}>Export JSON</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: palette.danger }]}
            onPress={onClear}
          >
            <Text style={styles.actionLabel}>Clear queue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[typography.h2, { marginBottom: spacing.sm }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.row}>
      <Text style={typography.body}>{label}</Text>
      <Text style={typography.body}>{value}</Text>
    </View>
  );
}

function formatMs(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
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
    marginBottom: spacing.lg,
  },
  closeBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  closeLabel: { color: palette.parchment, fontWeight: '600' },
  flash: {
    padding: spacing.sm,
    backgroundColor: palette.purpleDeep,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  actionLabel: {
    color: palette.bgDeep,
    fontWeight: '700',
  },
});
