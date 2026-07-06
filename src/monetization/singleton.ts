import { MockProvider, type MonetizationProvider } from './provider';

/**
 * Application-wide provider singleton. In production this is where a real
 * RevenueCat / AdMob adapter would be installed at boot; in dev, tests, and
 * the shipped mock build it's the MockProvider.
 */
let instance: MonetizationProvider = new MockProvider();

export function getMonetization(): MonetizationProvider {
  return instance;
}

export function setMonetization(next: MonetizationProvider): void {
  instance = next;
}

export function resetMonetization(): void {
  instance = new MockProvider();
}
