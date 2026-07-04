import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { useMonetization } from '../state/monetization';
import { useUI } from '../state/ui';
import { getMonetization } from '../monetization/singleton';
import { track } from '../telemetry/logger';
import {
  GEM_PACKAGES,
  STARTER_BUNDLE,
  PIGGY_UNLOCK,
  SUBSCRIPTION,
  BATTLE_PASS,
} from '../monetization/catalog';
import type { ProductDef } from '../monetization/types';
import { PIGGY_MAX_GEMS } from '../monetization/piggyBank';

interface CardProps {
  product: ProductDef;
  onBuy(): void;
  disabled?: boolean;
}

function ProductCard({ product, onBuy, disabled }: CardProps): React.ReactElement {
  return (
    <Pressable
      style={[
        styles.card,
        product.badge === 'best_value' && styles.cardBest,
        product.badge === 'anchor' && styles.cardAnchor,
        disabled && styles.cardDisabled,
      ]}
      onPress={onBuy}
      disabled={disabled}
    >
      {product.badge && (
        <View style={[styles.badge, badgeStyleFor(product.badge)]}>
          <Text style={styles.badgeLabel}>
            {product.badge === 'best_value'
              ? 'Best Value'
              : product.badge === 'popular'
                ? 'Popular'
                : 'Big Vault'}
          </Text>
        </View>
      )}
      <Text style={typography.h2}>{product.title}</Text>
      {product.subtitle && (
        <Text style={typography.small}>{product.subtitle}</Text>
      )}
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>{product.displayPrice}</Text>
      </View>
    </Pressable>
  );
}

function badgeStyleFor(badge: 'best_value' | 'popular' | 'anchor') {
  switch (badge) {
    case 'best_value':
      return { backgroundColor: palette.emerald };
    case 'popular':
      return { backgroundColor: palette.candlelight };
    case 'anchor':
      return { backgroundColor: palette.purple };
  }
}

export function StoreScreen(): React.ReactElement {
  useEffect(() => {
    track('store_open', { source: 'hub' });
  }, []);
  const gems = useProfile((s) => s.gems);
  const coins = useProfile((s) => s.coins);
  const embers = useProfile((s) => s.embers);
  const piggy = useMonetization((s) => s.piggy);
  const purchasedSkus = useMonetization((s) => s.purchasedSkus);
  const purchaseProduct = useMonetization((s) => s.purchaseProduct);
  const crackPiggy = useMonetization((s) => s.crackPiggy);
  const activateSubscription = useMonetization((s) => s.activateSubscription);
  const unlockPassPremium = useMonetization((s) => s.unlockPassPremium);
  const goToHub = useUI((s) => s.goToHub);

  const buyProduct = useCallback(
    async (product: ProductDef) => {
      const provider = getMonetization();
      const result =
        product.kind === 'subscription'
          ? await provider.subscribe(product.sku)
          : await provider.purchase(product.sku);
      if (!result.success) return;
      if (product.kind === 'piggyUnlock') {
        crackPiggy(Date.now());
        purchaseProduct(product, Date.now());
        return;
      }
      if (product.kind === 'subscription') {
        activateSubscription(Date.now());
        purchaseProduct(product, Date.now());
        return;
      }
      if (product.kind === 'battlePass') {
        unlockPassPremium(Date.now());
        purchaseProduct(product, Date.now());
        return;
      }
      purchaseProduct(product, Date.now());
      if (product.kind === 'segmentedOffer') {
        track('offer_purchased', { sku: product.sku, levelId: 'unknown' });
      }
    },
    [purchaseProduct, crackPiggy, activateSubscription, unlockPassPremium],
  );

  const starterBought = purchasedSkus.includes(STARTER_BUNDLE.sku);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Store</Text>
          <Text style={typography.small}>Support the apothecary.</Text>
        </View>
        <Pressable style={styles.backBtn} onPress={() => goToHub()}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.wallet}>
        <Text style={typography.small}>💎 {gems} · 🪙 {coins} · 🔥 {embers}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {!starterBought && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starter Bundle</Text>
            <ProductCard product={STARTER_BUNDLE} onBuy={() => buyProduct(STARTER_BUNDLE)} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gems</Text>
          {GEM_PACKAGES.map((p) => (
            <ProductCard key={p.sku} product={p} onBuy={() => buyProduct(p)} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Piggy Bank</Text>
          <View style={[styles.card, styles.cardPiggy]}>
            <Text style={typography.h2}>Piggy Bank</Text>
            <Text style={typography.small}>
              {piggy.gems} / {PIGGY_MAX_GEMS} saved
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (piggy.gems / PIGGY_MAX_GEMS) * 100)}%` },
                ]}
              />
            </View>
            <Pressable
              style={[styles.claimBtn, piggy.gems <= 0 && styles.cardDisabled]}
              onPress={() => buyProduct(PIGGY_UNLOCK)}
              disabled={piggy.gems <= 0}
            >
              <Text style={styles.claimLabel}>
                Crack for {piggy.gems}💎 · {PIGGY_UNLOCK.displayPrice}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apprentice's Oath</Text>
          <ProductCard product={SUBSCRIPTION} onBuy={() => buyProduct(SUBSCRIPTION)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battle Pass</Text>
          <ProductCard product={BATTLE_PASS} onBuy={() => buyProduct(BATTLE_PASS)} />
        </View>
      </ScrollView>
    </View>
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
  wallet: {
    backgroundColor: palette.bgSurface,
    borderRadius: radii.md,
    borderColor: palette.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardBest: { borderColor: palette.emerald, borderWidth: 2 },
  cardAnchor: { borderColor: palette.purple },
  cardPiggy: { borderColor: palette.candlelightSoft },
  cardDisabled: { opacity: 0.5 },
  badge: {
    position: 'absolute',
    top: -8,
    right: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  badgeLabel: { color: palette.bgDeep, fontSize: 10, fontWeight: '700' },
  priceRow: { marginTop: spacing.sm },
  priceLabel: {
    color: palette.candlelight,
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    marginTop: spacing.sm,
    backgroundColor: palette.bgSurface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: palette.candlelight },
  claimBtn: {
    marginTop: spacing.md,
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  claimLabel: { color: palette.bgDeep, fontWeight: '700' },
});
