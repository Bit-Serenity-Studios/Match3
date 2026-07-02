export const ENGINE_CONFIG = {
  cascade: {
    baseScore: 60,
    match4Bonus: 40,
    match5Bonus: 100,
    shapeBonus: 60,
    // Cascade step multiplier (step 0 -> 1x, 1 -> 1.5x, 2 -> 2x ...)
    stepMultiplier: (step: number): number => 1 + step * 0.5,
    maxCascadeSteps: 40,
  },
  blockers: {
    vine: { startLayers: 2 },
    frostGlass: { startLayers: 1 },
    stoneRune: { startLayers: 1 },
    ivy: {
      spreadEveryNTurns: 1,
      maxCells: 12,
    },
  },
  specials: {
    // Cells cleared by Bomb Bloom around center (Chebyshev distance <= 1)
    bombRadius: 1,
  },
  shuffle: {
    // Max attempts before giving up and accepting a suboptimal reshuffle
    maxAttempts: 32,
  },
} as const;
