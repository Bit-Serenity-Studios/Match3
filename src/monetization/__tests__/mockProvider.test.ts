import { MockProvider } from '../mockProvider';
import type { Sku } from '../types';

const SKU: Sku = {
  id: 'gems-small',
  kind: 'gems',
  title: 'A pinch of stardust',
  priceUsdCents: 99,
  reward: { gems: 100, coins: 0, embers: 0, lives: 0 },
};

describe('MockProvider', () => {
  test('purchase succeeds by default', async () => {
    const p = new MockProvider();
    const r = await p.purchase(SKU);
    expect(r.ok).toBe(true);
    expect(r.sku).toBe('gems-small');
    expect(r.transactionId).toBeDefined();
  });

  test('purchase can be forced to fail', async () => {
    const p = new MockProvider({ purchaseFailRate: 1 });
    const r = await p.purchase(SKU);
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });

  test('rewarded ad is watched by default (dismiss rate low)', async () => {
    const p = new MockProvider({ adDismissRate: 0 });
    const r = await p.showRewardedAd('rescueLife');
    expect(r.ok).toBe(true);
    expect(r.rewarded).toBe(true);
  });

  test('rewarded ad can be dismissed', async () => {
    const p = new MockProvider({ adDismissRate: 1 });
    const r = await p.showRewardedAd('rescueLife');
    expect(r.rewarded).toBe(false);
  });

  test('interstitial always ok, never rewarded', async () => {
    const p = new MockProvider();
    const r = await p.showInterstitial('interstitialReturnToHub');
    expect(r.ok).toBe(true);
    expect(r.rewarded).toBe(false);
  });

  test('onLog fires for every event kind', async () => {
    const log: string[] = [];
    const p = new MockProvider({
      onLog: (k) => log.push(k),
    });
    await p.purchase(SKU);
    await p.showRewardedAd('coinDouble');
    await p.showInterstitial('interstitialReturnToHub');
    expect(log).toEqual(['purchase', 'rewarded', 'interstitial']);
  });
});
