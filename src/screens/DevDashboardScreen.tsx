import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useTelemetry } from '../telemetry/logger';
import {
  computeApsFromPlay,
  computeFailMargins,
  funnelCounts,
} from '../telemetry/queue';
import { useUI } from '../state/ui';
import { LEVELS } from '../levels/catalog';

type Tab = 'aps' | 'fails' | 'funnel' | 'events';

export function DevDashboardScreen(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('aps');
  const queue = useTelemetry((s) => s.queue);
  const sessionId = useTelemetry((s) => s.sessionId);
  const goToGame = useUI((s) => s.goToGame);
  const clear = useTelemetry((s) => s.clear);
  const exportJson = useTelemetry((s) => s.exportJson);
  const [copied, setCopied] = useState<string | null>(null);

  const aps = useMemo(() => computeApsFromPlay(queue), [queue]);
  const margins = useMemo(() => computeFailMargins(queue), [queue]);
  const funnel = useMemo(() => funnelCounts(queue), [queue]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Dev Dashboard</Text>
          <Text style={typography.small}>
            {queue.length} events · session {sessionId.slice(0, 12) || '—'}
          </Text>
        </View>
        <Pressable style={styles.backBtn} onPress={goToGame}>
          <Text style={styles.backLabel}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <TabBtn label="APS" active={tab === 'aps'} onPress={() => setTab('aps')} />
        <TabBtn label="Fail Δ" active={tab === 'fails'} onPress={() => setTab('fails')} />
        <TabBtn label="Funnel" active={tab === 'funnel'} onPress={() => setTab('funnel')} />
        <TabBtn label="Events" active={tab === 'events'} onPress={() => setTab('events')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {tab === 'aps' && (
          <>
            <Text style={styles.sectionTitle}>Real-play APS (attempts / wins)</Text>
            {LEVELS.slice(0, 30).map((lv) => {
              const r = aps[lv.id];
              return (
                <View key={lv.id} style={styles.row}>
                  <Text style={styles.rowLabel}>
                    {lv.id} · {lv.archetype}
                  </Text>
                  <Text style={styles.rowValue}>
                    {r ? `${r.attempts}/${r.wins} = ${r.aps === Infinity ? '∞' : r.aps.toFixed(2)}` : '—'}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {tab === 'fails' && (
          <>
            <Text style={styles.sectionTitle}>Median fail margin per level</Text>
            {Object.entries(margins).map(([levelId, m]) => (
              <View key={levelId} style={styles.row}>
                <Text style={styles.rowLabel}>{levelId}</Text>
                <Text style={styles.rowValue}>{m.toFixed(3)}</Text>
              </View>
            ))}
            {Object.keys(margins).length === 0 && (
              <Text style={styles.hint}>No failures recorded yet.</Text>
            )}
          </>
        )}

        {tab === 'funnel' && (
          <>
            <Text style={styles.sectionTitle}>Funnel counts</Text>
            {Object.entries(funnel).map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.rowLabel}>{k}</Text>
                <Text style={styles.rowValue}>{v}</Text>
              </View>
            ))}
            <Text style={[styles.hint, { marginTop: spacing.md }]}>
              Compare against the sim: APS numbers should match archetype
              bands from the Phase 2 simulator once players approximate
              the myopic bot.
            </Text>
          </>
        )}

        {tab === 'events' && (
          <>
            <Text style={styles.sectionTitle}>Recent events (newest first)</Text>
            {queue.slice(-40).reverse().map((ev, i) => (
              <View key={i} style={styles.event}>
                <Text style={styles.eventType}>{ev.type}</Text>
                <Text style={styles.eventPayload}>{JSON.stringify(ev.payload)}</Text>
              </View>
            ))}
            {queue.length === 0 && <Text style={styles.hint}>No events yet.</Text>}
          </>
        )}

        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              const json = exportJson();
              setCopied(json.slice(0, 80) + '…');
            }}
          >
            <Text style={styles.actionLabel}>Export JSON</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: palette.danger }]}
            onPress={clear}
          >
            <Text style={styles.actionLabel}>Clear queue</Text>
          </Pressable>
        </View>
        {copied && (
          <Text style={styles.hint} numberOfLines={4}>
            Preview: {copied}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function TabBtn({ label, active, onPress }: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabLabel, active && { color: palette.candlelight }]}>{label}</Text>
    </Pressable>
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
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.bgSurface,
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
  },
  tabBtnActive: { borderColor: palette.candlelight },
  tabLabel: { color: palette.parchmentDim, fontWeight: '600' },
  sectionTitle: { ...typography.h2, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
  },
  rowLabel: { color: palette.parchmentDim, fontSize: 12 },
  rowValue: { color: palette.parchment, fontSize: 12, fontWeight: '600' },
  event: {
    padding: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  eventType: { color: palette.candlelight, fontSize: 12, fontWeight: '700' },
  eventPayload: { color: palette.parchmentDim, fontSize: 10, marginTop: 2 },
  hint: { color: palette.parchmentDim, marginTop: spacing.sm, fontSize: 11 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: palette.bgSurface2,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  actionLabel: { color: palette.parchment, fontWeight: '600' },
});
