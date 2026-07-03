import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import {
  GEM_PACKS,
  STARTER_BUNDLE,
  SUBSCRIPTION_MONTHLY,
  PIGGY_BANK_UNLOCK,
} from '../monetization/catalog';
import { isRipe, PIGGY_CAP_GEMS } from '../monetization/piggyBank';
import { FEATURE_FLAGS } from '../config/flags';
import { isActive as subIsActive } from '../monetization/subscription';
import type { Sku } from '../monetization/types';

export function StoreScreen() {
  const purchase = useProfile((s) => s.purchase);
  const starterClaimed = useProfile((s) => s.starterBundleClaimed);
  const piggy = useProfile((s) => s.piggy);
  const subscription = useProfile((s) => s.subscription);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const doPurchase = async (sku: Sku) => {
    if (busy) return;
    setBusy(sku.id);
    const r = await purchase(sku.id);
    setBusy(null);
    setFlash(r.ok ? `${sku.title} — delivered.` : `${r.error ?? 'purchase failed'}`);
    setTimeout(() => setFlash(null), 2200);
  };

  const iapOn = FEATURE_FLAGS.iapEnabled;
  const piggyOn = FEATURE_FLAGS.piggyBankEnabled;
  const subOn = FEATURE_FLAGS.subscriptionEnabled;
  const subLive = subIsActive(subscription, Date.now());

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 60 }}>
      {flash && (
        <View style={styles.flash}>
          <Text style={[typography.body, { color: palette.parchment, textAlign: 'center' }]}>
            {flash}
          </Text>
        </View>
      )}

      {iapOn && !starterClaimed && (
        <Section title="Apprentice's Kit">
          <SkuCard sku={STARTER_BUNDLE} busy={busy === STARTER_BUNDLE.id} onPress={() => doPurchase(STARTER_BUNDLE)} />
        </Section>
      )}

      {iapOn && (
        <Section title="Gems">
          {GEM_PACKS.map((p) => (
            <SkuCard
              key={p.id}
              sku={p}
              busy={busy === p.id}
              onPress={() => doPurchase(p)}
            />
          ))}
        </Section>
      )}

      {piggyOn && (
        <Section title="Piggy Bank">
          <View style={styles.card}>
            <Text style={typography.h2}>Ceramic Toad</Text>
            <Text style={typography.small}>
              {piggy.balance} / {PIGGY_CAP_GEMS} gems collected
            </Text>
            <View style={styles.piggyBar}>
              <View
                style={{
                  height: '100%',
                  width: `${(piggy.balance / PIGGY_CAP_GEMS) * 100}%`,
                  backgroundColor: isRipe(piggy)
                    ? palette.emerald
                    : palette.candlelightSoft,
                }}
              />
            </View>
            <Pressable
              disabled={piggy.balance === 0 || busy !== null}
              onPress={() => doPurchase(PIGGY_BANK_UNLOCK)}
              style={[
                styles.buy,
                (piggy.balance === 0 || busy !== null) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.buyLabel}>
                {busy === PIGGY_BANK_UNLOCK.id
                  ? 'Working…'
                  : `Break the piggy · $${(PIGGY_BANK_UNLOCK.priceUsdCents / 100).toFixed(2)}`}
              </Text>
            </Pressable>
          </View>
        </Section>
      )}

      {subOn && (
        <Section title="Apprentice's Oath">
          <View style={styles.card}>
            <Text style={typography.h2}>Monthly subscription</Text>
            <Text style={typography.small}>
              No interstitials · 30 gems / day · nameplate accent
            </Text>
            {subLive ? (
              <Text style={[typography.small, { color: palette.emerald, marginTop: spacing.sm }]}>
                Active
              </Text>
            ) : (
              <Pressable
                disabled={busy !== null}
                onPress={() => doPurchase(SUBSCRIPTION_MONTHLY)}
                style={[styles.buy, busy !== null && { opacity: 0.5 }]}
              >
                <Text style={styles.buyLabel}>
                  {busy === SUBSCRIPTION_MONTHLY.id
                    ? 'Working…'
                    : `Subscribe · $${(SUBSCRIPTION_MONTHLY.priceUsdCents / 100).toFixed(2)}`}
                </Text>
              </Pressable>
            )}
          </View>
        </Section>
      )}
    </ScrollView>
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

function SkuCard({ sku, busy, onPress }: { sku: any; busy: boolean; onPress: () => void }) {
  const tagStyle =
    sku.tag === 'value'
      ? { color: palette.emerald }
      : sku.tag === 'decoy'
        ? { color: palette.purple }
        : sku.tag === 'starter'
          ? { color: palette.candlelight }
          : null;
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={typography.h2}>{sku.title}</Text>
          {sku.tag && tagStyle && (
            <Text style={[typography.small, tagStyle]}>
              {sku.tag === 'value' ? '★ Best value' : sku.tag === 'starter' ? 'One-time' : ''}
            </Text>
          )}
          <View style={{ marginTop: spacing.xs }}>
            {sku.reward.gems > 0 && <Text style={typography.small}>💎 {sku.reward.gems}</Text>}
            {sku.reward.coins > 0 && <Text style={typography.small}>🪙 {sku.reward.coins}</Text>}
            {sku.reward.embers > 0 && <Text style={typography.small}>🔥 {sku.reward.embers}</Text>}
            {sku.reward.lives > 0 && <Text style={typography.small}>❤ {sku.reward.lives}</Text>}
          </View>
        </View>
        <Pressable
          disabled={busy}
          onPress={onPress}
          style={[styles.buy, busy && { opacity: 0.5 }]}
        >
          {busy ? (
            <ActivityIndicator color={palette.bgDeep} />
          ) : (
            <Text style={styles.buyLabel}>
              ${(sku.priceUsdCents / 100).toFixed(2)}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buy: {
    backgroundColor: palette.candlelight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    minWidth: 84,
    alignItems: 'center',
  },
  buyLabel: {
    color: palette.bgDeep,
    fontWeight: '700',
  },
  piggyBar: {
    height: 8,
    marginVertical: spacing.sm,
    backgroundColor: palette.bgSurface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  flash: {
    padding: spacing.md,
    backgroundColor: palette.purpleDeep,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
});
