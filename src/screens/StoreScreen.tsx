import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { CurrencyAmount, RewardChips } from '../components/Currency';
import { Icon } from '../components/Icon';
import { MenuButton } from '../components/MenuButton';
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
  getProduct,
} from '../monetization/catalog';
import { isActive as subscriptionActive } from '../monetization/subscription';
import type { ProductDef } from '../monetization/types';
import { PIGGY_MAX_GEMS } from '../monetization/piggyBank';
import { click } from '../audio/click';

interface CardProps {
  product: ProductDef;
  onBuy(): void;
  disabled?: boolean;
  /** Already owned — locks the card and shows an entitlement pill instead of
   *  the price. Used for one-time buys (Battle Pass, subscription). */
  owned?: boolean;
  ownedLabel?: string;
}

function ProductCard({
  product,
  onBuy,
  disabled,
  owned,
  ownedLabel,
}: CardProps): React.ReactElement {
  const locked = disabled || owned;
  return (
    <Pressable
      style={[
        styles.card,
        product.badge === 'best_value' && styles.cardBest,
        product.badge === 'anchor' && styles.cardAnchor,
        locked && styles.cardDisabled,
      ]}
      onPress={owned ? undefined : click(onBuy)}
      disabled={locked}
    >
      {product.badge && !owned && (
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
        {owned ? (
          <View style={styles.ownedPill}>
            <Icon name="check" size={14} tint={palette.bgDeep} />
            <Text style={styles.ownedLabel}>{ownedLabel ?? 'Owned'}</Text>
          </View>
        ) : (
          <Text style={styles.priceLabel}>{product.displayPrice}</Text>
        )}
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
  const subscription = useMonetization((s) => s.subscription);
  const passPremium = useMonetization((s) => s.pass.premiumUnlocked);
  const purchaseProduct = useMonetization((s) => s.purchaseProduct);
  const recordRestoredPurchase = useMonetization((s) => s.recordRestoredPurchase);
  const crackPiggy = useMonetization((s) => s.crackPiggy);
  const unlockPassPremium = useMonetization((s) => s.unlockPassPremium);
  const goToHome = useUI((s) => s.goToHome);
  const [thanks, setThanks] = useState<ProductDef | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

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
      } else if (product.kind === 'battlePass') {
        unlockPassPremium(Date.now());
      }
      // purchaseProduct records the SKU and applies grants for every kind
      // (incl. the subscription's 30 days via grants.subscriptionDays — one
      // activation only, so a purchase grants 30 days, not 60).
      purchaseProduct(product, Date.now());
      if (product.kind === 'segmentedOffer') {
        track('offer_purchased', { sku: product.sku, levelId: 'unknown' });
      }
      setThanks(product);
    },
    [purchaseProduct, crackPiggy, unlockPassPremium],
  );

  const restorePurchases = useCallback(async () => {
    setRestoring(true);
    try {
      const results = await getMonetization().restore();
      const ok = results.filter((r) => r.success);
      for (const r of ok) {
        const product = getProduct(r.sku);
        if (product) recordRestoredPurchase(product, Date.now());
      }
      setRestoreMsg(
        ok.length > 0
          ? `Restored ${ok.length} purchase${ok.length === 1 ? '' : 's'}.`
          : 'No previous purchases found for this account.',
      );
    } catch {
      setRestoreMsg('Restore failed. Check your connection and try again.');
    } finally {
      setRestoring(false);
    }
  }, [recordRestoredPurchase]);

  const starterBought = purchasedSkus.includes(STARTER_BUNDLE.sku);
  const subscribed = subscriptionActive(subscription, Date.now());
  const battlePassOwned = passPremium || purchasedSkus.includes(BATTLE_PASS.sku);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <MenuButton />
        <View style={styles.headerTitle}>
          <Text style={typography.h1}>Store</Text>
          <Text style={typography.small}>Support the apothecary.</Text>
        </View>
        <Pressable style={styles.backBtn} onPress={click(() => goToHome())}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.wallet}>
        <RewardChips
          grants={{ gems, coins, embers }}
          size={14}
          textStyle={typography.small}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {!starterBought && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starter Bundle</Text>
            <ProductCard product={STARTER_BUNDLE} onBuy={() => buyProduct(STARTER_BUNDLE)} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stars</Text>
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
              <View style={styles.claimRow}>
                <Text style={styles.claimLabel}>Crack for</Text>
                <CurrencyAmount
                  kind="gems"
                  amount={piggy.gems}
                  size={14}
                  tint={palette.bgDeep}
                  textStyle={styles.claimLabel}
                />
                <Text style={styles.claimLabel}>· {PIGGY_UNLOCK.displayPrice}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apprentice's Oath</Text>
          <ProductCard
            product={SUBSCRIPTION}
            onBuy={() => buyProduct(SUBSCRIPTION)}
            owned={subscribed}
            ownedLabel="Active"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battle Pass</Text>
          <ProductCard
            product={BATTLE_PASS}
            onBuy={() => buyProduct(BATTLE_PASS)}
            owned={battlePassOwned}
            ownedLabel="Owned"
          />
        </View>

        <View style={styles.section}>
          <Pressable
            style={[styles.restoreBtn, restoring && styles.cardDisabled]}
            onPress={click(restorePurchases)}
            disabled={restoring}
          >
            <Text style={styles.restoreLabel}>
              {restoring ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </Pressable>
          {restoreMsg && <Text style={styles.restoreMsg}>{restoreMsg}</Text>}
          <Text style={styles.restoreHint}>
            Reinstates ad-free play, the Battle Pass, and other one-time
            unlocks on a new device or after reinstalling.
          </Text>
        </View>
      </ScrollView>

      {thanks && (
        <View style={styles.thanksOverlay}>
          <View style={styles.thanksCard}>
            <Icon name="sparkle" size={40} />
            <Text style={styles.thanksTitle}>Thank you!</Text>
            <Text style={styles.thanksBody}>
              {thanks.title}
              {thanks.subtitle ? ` — ${thanks.subtitle}` : ''} is yours. Thanks for
              supporting the apothecary.
            </Text>
            <Pressable style={styles.thanksBtn} onPress={click(() => setThanks(null))}>
              <Text style={styles.thanksBtnLabel}>Continue</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  ownedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: palette.emerald,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  ownedLabel: { color: palette.bgDeep, fontWeight: '800', fontSize: 13 },
  restoreBtn: {
    borderColor: palette.border,
    borderWidth: 1,
    backgroundColor: palette.bgSurface,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  restoreLabel: { color: palette.parchment, fontWeight: '700' },
  restoreMsg: {
    ...typography.small,
    color: palette.candlelight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  restoreHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  thanksOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 300,
  },
  thanksCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelight,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  thanksTitle: { ...typography.h1, fontSize: 24, textAlign: 'center' },
  thanksBody: {
    ...typography.body,
    color: palette.parchment,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  thanksBtn: {
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
  },
  thanksBtnLabel: { color: palette.bgDeep, fontWeight: '800', fontSize: 16 },
});
