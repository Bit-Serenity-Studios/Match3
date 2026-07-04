import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile, UNLOCK_COMPANIONS_AT, UNLOCK_EXPEDITIONS_AT } from '../state/profile';
import { useUI, type HubTab } from '../state/ui';
import { track } from '../telemetry/logger';
import { useRetention } from '../state/retention';
import { FIXTURES, upgradeCost } from '../hub/fixtures';
import { COMPANIONS, getCompanion } from '../companions/catalog';
import { pull, PULL_COST_EMBERS } from '../companions/gacha';
import { xpProgress } from '../companions/progression';
import { EXPEDITION_MINUTES, MAX_SLOTS, type ExpeditionDuration } from '../expeditions/types';
import type { CompanionDef, Rarity } from '../companions/types';

const RARITY_HEX: Record<Rarity, string> = {
  common: '#a8a8b0',
  rare: '#7fa9d6',
  epic: '#b98be0',
  legendary: '#e6b25a',
};

export function HubScreen() {
  const tab = useUI((s) => s.hubTab);
  const setTab = useUI((s) => s.setHubTab);
  const goToGame = useUI((s) => s.goToGame);
  const coins = useProfile((s) => s.coins);
  const embers = useProfile((s) => s.embers);
  const gems = useProfile((s) => s.gems);
  const highest = useProfile((s) => s.highestUnlocked);

  const showCompanions = highest >= UNLOCK_COMPANIONS_AT;
  const showExpeditions = highest >= UNLOCK_EXPEDITIONS_AT;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Apothecary</Text>
          <Pressable onLongPress={() => useUI.getState().goToDevDashboard()} delayLongPress={800}>
            <Text style={typography.small}>Between the moon and the kettle. · v0.4</Text>
          </Pressable>
        </View>
        <Pressable style={styles.playBtn} onPress={goToGame}>
          <Text style={styles.playLabel}>Play</Text>
        </Pressable>
      </View>

      <View style={styles.currencies}>
        <Currency label="Coins" value={coins} color={palette.candlelight} />
        <Currency label="Embers" value={embers} color="#e97e7e" />
        <Currency label="Gems" value={gems} color={palette.purple} />
      </View>

      <View style={styles.topRow}>
        <Pressable style={styles.linkBtn} onPress={() => useUI.getState().goToDaily()}>
          <Text style={styles.linkLabel}>Daily</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => useUI.getState().goToStore()}>
          <Text style={styles.linkLabel}>Store</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => useUI.getState().goToPass()}>
          <Text style={styles.linkLabel}>Pass</Text>
        </Pressable>
      </View>

      <SoftAskBanner />

      <View style={styles.tabs}>
        <TabBtn label="Fixtures" active={tab === 'fixtures'} onPress={() => setTab('fixtures')} />
        <TabBtn
          label="Companions"
          active={tab === 'companions'}
          onPress={() => setTab('companions')}
          locked={!showCompanions}
        />
        <TabBtn
          label="Expeditions"
          active={tab === 'expeditions'}
          onPress={() => setTab('expeditions')}
          locked={!showExpeditions}
        />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
        {tab === 'fixtures' && <FixturesTab />}
        {tab === 'companions' && (showCompanions ? <CompanionsTab /> : <LockedNote at={UNLOCK_COMPANIONS_AT} what="Companions" />)}
        {tab === 'expeditions' && (showExpeditions ? <ExpeditionsTab /> : <LockedNote at={UNLOCK_EXPEDITIONS_AT} what="Expeditions" />)}
      </ScrollView>
    </View>
  );
}

function Currency({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.currency}>
      <Text style={[typography.small, { color }]}>{label}</Text>
      <Text style={[typography.score, { color }]}>{value}</Text>
    </View>
  );
}

function TabBtn({
  label,
  active,
  onPress,
  locked,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={[
        styles.tabBtn,
        active && styles.tabBtnActive,
        locked && styles.tabBtnLocked,
      ]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive, locked && styles.tabLabelLocked]}>
        {locked ? '🔒 ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

function LockedNote({ at, what }: { at: number; what: string }) {
  return (
    <View style={styles.locked}>
      <Text style={typography.body}>
        {what} unlock at level {at + 1}. Keep brewing.
      </Text>
    </View>
  );
}

function FixturesTab() {
  const fixtureLevels = useProfile((s) => s.fixtureLevels);
  const coins = useProfile((s) => s.coins);
  const upgrade = useProfile((s) => s.upgradeFixture);
  return (
    <View>
      {FIXTURES.map((f) => {
        const lv = fixtureLevels[f.id] ?? 0;
        const cost = upgradeCost(f.id, lv);
        const canAfford = cost !== null && coins >= cost;
        return (
          <View key={f.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={typography.h2}>{f.name}</Text>
              <Text style={typography.small}>Tier {lv}/{f.maxLevel}</Text>
            </View>
            <Text style={typography.small}>{f.flavor}</Text>
            <View style={styles.cardFooter}>
              <Pressable
                disabled={!canAfford}
                onPress={() => upgrade(f.id)}
                style={[styles.smallBtn, !canAfford && styles.smallBtnDisabled]}
              >
                <Text style={styles.smallBtnLabel}>
                  {cost === null ? 'Max tier' : `Upgrade · ${cost} coins`}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SoftAskBanner(): React.ReactElement | null {
  const shouldPrompt = useRetention((s) => s.shouldPromptSoftAsk(Date.now()));
  const handle = useRetention((s) => s.handleSoftAskResponse);
  if (!shouldPrompt) return null;
  return (
    <View style={styles.softAsk}>
      <Text style={[typography.body, { color: palette.parchment }]}>
        Want a nudge when your kettle's ready?
      </Text>
      <Text style={typography.small}>
        We'll notify you when lives fill and expeditions return. Nothing else.
      </Text>
      <View style={styles.softAskRow}>
        <Pressable
          style={styles.softAskYes}
          onPress={() => handle(true, Date.now())}
        >
          <Text style={styles.softAskYesLabel}>Sure</Text>
        </Pressable>
        <Pressable
          style={styles.softAskNo}
          onPress={() => handle(false, Date.now())}
        >
          <Text style={styles.softAskNoLabel}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompanionsTab() {
  const owned = useProfile((s) => s.ownedCompanions);
  const equipped = useProfile((s) => s.equippedCompanionId);
  const equip = useProfile((s) => s.equipCompanion);
  const embers = useProfile((s) => s.embers);
  const pity = useProfile((s) => s.pity);
  const spendEmbers = useProfile((s) => s.spendEmbers);
  const addCompanion = useProfile((s) => s.addCompanion);
  const setPity = useProfile((s) => s.setPity);
  const tryEvolve = useProfile((s) => s.tryEvolveCompanion);

  const [lastPull, setLastPull] = useState<{ name: string; rarity: Rarity; isNew: boolean; shards: number } | null>(null);

  const doPull = () => {
    if (!spendEmbers(PULL_COST_EMBERS)) return;
    const ownedIds = new Set(owned.map((c) => c.id));
    const r = pull(pity, ownedIds);
    addCompanion(r.outcome.companion.id, r.outcome.isNew, r.outcome.shardsAwarded);
    setPity(r.pity);
    track('gacha_pull', {
      rarity: r.outcome.companion.rarity,
      companionId: r.outcome.companion.id,
      isNew: r.outcome.isNew,
      shardsAwarded: r.outcome.shardsAwarded,
      cost: PULL_COST_EMBERS,
    });
    setLastPull({
      name: r.outcome.companion.name,
      rarity: r.outcome.companion.rarity,
      isNew: r.outcome.isNew,
      shards: r.outcome.shardsAwarded,
    });
  };

  const canPull = embers >= PULL_COST_EMBERS;

  return (
    <View>
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Text style={typography.h2}>Summoning Cauldron</Text>
        <Text style={typography.small}>Cost · {PULL_COST_EMBERS} embers</Text>
        <Pressable
          disabled={!canPull}
          onPress={doPull}
          style={[styles.smallBtn, !canPull && styles.smallBtnDisabled, { marginTop: spacing.md }]}
        >
          <Text style={styles.smallBtnLabel}>Draw a companion</Text>
        </Pressable>
        {lastPull && (
          <View style={styles.pullResult}>
            <Text style={[typography.h2, { color: RARITY_HEX[lastPull.rarity] }]}>
              {lastPull.name}
            </Text>
            <Text style={typography.small}>
              {lastPull.rarity}
              {lastPull.isNew
                ? ' · joined the shop'
                : ` · +${lastPull.shards} shards`}
            </Text>
          </View>
        )}
      </View>

      {owned.map((c) => {
        const def = getCompanion(c.id);
        if (!def) return null;
        const isEquipped = equipped === c.id;
        const prog = xpProgress(c);
        return (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[typography.h2, { color: RARITY_HEX[def.rarity] }]}>
                {def.name}
              </Text>
              <Text style={typography.small}>Lvl {c.level} · Tier {c.tier}</Text>
            </View>
            <Text style={typography.small}>{def.flavor}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${prog.fraction * 100}%` }]} />
            </View>
            <Text style={typography.small}>
              Shards {c.shards} · affinity {def.affinityColor}
            </Text>
            <View style={styles.cardFooter}>
              <Pressable
                onPress={() => equip(isEquipped ? null : c.id)}
                style={[styles.smallBtn, isEquipped && styles.smallBtnActive]}
              >
                <Text style={styles.smallBtnLabel}>
                  {isEquipped ? 'Equipped' : 'Equip'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => tryEvolve(c.id)}
                style={[styles.smallBtn, { marginLeft: spacing.sm }]}
              >
                <Text style={styles.smallBtnLabel}>Evolve</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      {owned.length === 0 && (
        <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.lg }]}>
          The cauldron is quiet. Draw a companion to begin.
        </Text>
      )}
    </View>
  );
}

function ExpeditionsTab() {
  const owned = useProfile((s) => s.ownedCompanions);
  const active = useProfile((s) => s.activeExpeditions);
  const start = useProfile((s) => s.startExpedition);
  const claim = useProfile((s) => s.claimExpedition);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [pickCompanion, setPickCompanion] = useState<string | null>(null);
  const [pickDuration, setPickDuration] = useState<ExpeditionDuration>('short');

  const busyCompanions = new Set(active.map((e) => e.companionId));

  return (
    <View>
      <View style={styles.card}>
        <Text style={typography.h2}>New expedition</Text>
        <Text style={typography.small}>
          Companion won't return until the timer completes.
        </Text>
        {owned.length === 0 && (
          <Text style={[typography.body, { marginTop: spacing.sm }]}>
            You need at least one companion first.
          </Text>
        )}
        <View style={styles.row}>
          {owned.map((c) => {
            const def = getCompanion(c.id);
            if (!def) return null;
            const disabled = busyCompanions.has(c.id);
            const selected = pickCompanion === c.id;
            return (
              <Pressable
                key={c.id}
                disabled={disabled}
                onPress={() => setPickCompanion(c.id)}
                style={[
                  styles.chip,
                  selected && styles.chipActive,
                  disabled && styles.chipDisabled,
                ]}
              >
                <Text style={[typography.small, { color: RARITY_HEX[def.rarity] }]}>
                  {def.name.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          {(['short', 'medium', 'long'] as ExpeditionDuration[]).map((d) => (
            <Pressable
              key={d}
              onPress={() => setPickDuration(d)}
              style={[styles.chip, pickDuration === d && styles.chipActive]}
            >
              <Text style={typography.small}>
                {d} · {formatDuration(EXPEDITION_MINUTES[d])}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          disabled={!pickCompanion || active.length >= MAX_SLOTS}
          onPress={() => {
            if (pickCompanion && start(pickCompanion, pickDuration, Date.now())) {
              track('expedition_start', {
                companionId: pickCompanion,
                duration: pickDuration,
              });
              setPickCompanion(null);
            }
          }}
          style={[
            styles.smallBtn,
            (!pickCompanion || active.length >= MAX_SLOTS) &&
              styles.smallBtnDisabled,
            { marginTop: spacing.md },
          ]}
        >
          <Text style={styles.smallBtnLabel}>Dispatch</Text>
        </Pressable>
      </View>

      <Text style={[typography.h2, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
        Active ({active.length}/{MAX_SLOTS})
      </Text>
      {active.map((e, i) => {
        const def = getCompanion(e.companionId);
        const remaining = Math.max(0, e.endsAt - now);
        const ready = remaining === 0;
        return (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={typography.h2}>{def?.name ?? e.companionId}</Text>
              <Text style={typography.small}>{e.duration}</Text>
            </View>
            <Text style={typography.small}>
              {ready ? 'Home safe.' : `Returns in ${formatMs(remaining)}`}
            </Text>
            <View style={styles.cardFooter}>
              <Pressable
                disabled={!ready}
                onPress={() => {
                  const rew = claim(i, Date.now());
                  if (rew) {
                    track('expedition_claim', {
                      companionId: e.companionId,
                      duration: e.duration,
                      coins: rew.coins,
                      embers: rew.embers,
                      gems: 0,
                      shards: 0,
                    });
                  }
                }}
                style={[styles.smallBtn, !ready && styles.smallBtnDisabled]}
              >
                <Text style={styles.smallBtnLabel}>{ready ? 'Claim' : 'Waiting…'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      {active.length === 0 && (
        <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.md }]}>
          No expeditions in flight.
        </Text>
      )}
    </View>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
}

function formatMs(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
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
  playBtn: {
    backgroundColor: palette.candlelight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  playLabel: {
    color: palette.bgDeep,
    fontWeight: '700',
  },
  currencies: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
  },
  linkLabel: { color: palette.parchment, fontWeight: '600' },
  softAsk: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  softAskRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  softAskYes: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.candlelight,
    alignItems: 'center',
  },
  softAskNo: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
  },
  softAskYesLabel: { color: palette.bgDeep, fontWeight: '700' },
  softAskNoLabel: { color: palette.parchmentDim },
  currency: {
    flex: 1,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.bgSurface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: palette.purpleDeep,
    borderColor: palette.purple,
  },
  tabBtnLocked: {
    opacity: 0.5,
  },
  tabLabel: {
    color: palette.parchmentDim,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: palette.parchment,
  },
  tabLabelLocked: {
    color: palette.parchmentDim,
  },
  body: { flex: 1 },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: spacing.md,
    alignItems: 'center',
  },
  smallBtn: {
    backgroundColor: palette.purpleDeep,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  smallBtnActive: {
    backgroundColor: palette.emeraldDeep,
  },
  smallBtnDisabled: {
    opacity: 0.4,
  },
  smallBtnLabel: {
    color: palette.parchment,
    fontWeight: '600',
  },
  xpBar: {
    height: 6,
    backgroundColor: palette.bgSurface2,
    borderRadius: 3,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: palette.candlelight,
  },
  pullResult: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: palette.bgSurface2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: {
    borderColor: palette.candlelight,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  locked: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
