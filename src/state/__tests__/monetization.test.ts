import { useMonetization } from '../monetization';
import {
  SUBSCRIPTION,
  BATTLE_PASS,
  STARTER_BUNDLE,
} from '../../monetization/catalog';
import { isActive } from '../../monetization/subscription';
import { useProfile } from '../profile';

const NOW = 1_700_000_000_000;

describe('recordRestoredPurchase', () => {
  beforeEach(() => {
    useMonetization.getState().resetMonetization();
  });

  test('subscription restore re-activates ad-free and records the SKU', () => {
    useMonetization.getState().recordRestoredPurchase(SUBSCRIPTION, NOW);
    const s = useMonetization.getState();
    expect(s.purchasedSkus).toContain(SUBSCRIPTION.sku);
    expect(s.everPurchased).toBe(true);
    expect(isActive(s.subscription, NOW)).toBe(true);
  });

  test('battle-pass restore re-unlocks the premium track', () => {
    useMonetization.getState().recordRestoredPurchase(BATTLE_PASS, NOW);
    const s = useMonetization.getState();
    expect(s.purchasedSkus).toContain(BATTLE_PASS.sku);
    expect(s.pass.premiumUnlocked).toBe(true);
  });

  test('restore does NOT re-grant consumable currency (no double-dip)', () => {
    const before = useProfile.getState().gems;
    // The starter bundle grants 80 gems on purchase; a RESTORE must not.
    useMonetization.getState().recordRestoredPurchase(STARTER_BUNDLE, NOW);
    expect(useProfile.getState().gems).toBe(before);
    // ...but ownership is still recorded so the one-shot stays hidden.
    expect(useMonetization.getState().purchasedSkus).toContain(
      STARTER_BUNDLE.sku,
    );
  });

  test('restoring the same SKU twice does not duplicate it', () => {
    useMonetization.getState().recordRestoredPurchase(SUBSCRIPTION, NOW);
    useMonetization.getState().recordRestoredPurchase(SUBSCRIPTION, NOW);
    const count = useMonetization
      .getState()
      .purchasedSkus.filter((sku) => sku === SUBSCRIPTION.sku).length;
    expect(count).toBe(1);
  });
});
