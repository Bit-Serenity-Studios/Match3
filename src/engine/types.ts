export type TileColor =
  | 'moonpetal'
  | 'vial'
  | 'runestone'
  | 'resin'
  | 'mushroom';

export type SpecialKind =
  | 'lineH'
  | 'lineV'
  | 'bomb'
  | 'cross'
  | 'nova'
  | 'prism';

export type BlockerKind = 'vine' | 'frostGlass' | 'stoneRune' | 'ivy';

export interface Blocker {
  kind: BlockerKind;
  layers: number;
}

export interface Tile {
  color: TileColor | null;
  special?: SpecialKind;
  blocker?: Blocker;
}

export interface CellPos {
  row: number;
  col: number;
}

export interface BoardSnapshot {
  width: number;
  height: number;
  mask: boolean[]; // row-major, length = width*height
  tiles: (Tile | null)[]; // row-major
  rngState: number;
  ivyStepsSinceSpread: number;
}

export type Objective =
  | { kind: 'collectColor'; color: TileColor; count: number }
  | { kind: 'clearBlockers'; blocker?: BlockerKind }
  | { kind: 'dropIngredients'; tile: TileColor; count: number }
  | { kind: 'score'; target: number };

export interface ObjectiveProgress {
  progress: number;
  target: number;
  done: boolean;
}

export type LevelArchetype = 'tutorial' | 'wow' | 'procrastinating' | 'hard';

export interface LevelDef {
  id: string;
  width: number;
  height: number;
  mask: boolean[];
  startingLayout: (Tile | null)[];
  dropWeights: Record<TileColor, number>;
  objectives: Objective[];
  moves: number;
  archetype: LevelArchetype;
  seed: number;
}

export interface GameState {
  levelId: string;
  board: BoardSnapshot;
  movesRemaining: number;
  score: number;
  progress: ObjectiveProgress[];
  status: 'active' | 'won' | 'lost';
  difficultyMod: number;
  objectives: Objective[];
  dropWeights: Record<TileColor, number>;
  turn: number;
}

export type MatchShape = 'line' | 'L' | 'T';

export interface DetectedMatch {
  cells: CellPos[];
  length: number;
  shape: MatchShape;
  color: TileColor;
  /** Suggested cell to place the special at, if this match creates one. */
  origin?: CellPos;
  special?: SpecialKind;
}

export type BoardEvent =
  | { t: 'swap'; a: CellPos; b: CellPos; invalid?: boolean }
  | {
      t: 'match';
      cells: CellPos[];
      length: number;
      shape: MatchShape;
      color: TileColor;
    }
  | { t: 'clear'; cells: CellPos[] }
  | { t: 'specialCreated'; at: CellPos; kind: SpecialKind; color: TileColor }
  | {
      t: 'specialActivated';
      at: CellPos;
      kind: SpecialKind;
      cleared: CellPos[];
    }
  | {
      t: 'blockerHit';
      at: CellPos;
      kind: BlockerKind;
      layersLeft: number;
      cleared: boolean;
    }
  | { t: 'ivySpread'; from: CellPos; to: CellPos }
  | { t: 'gravity'; moves: { from: CellPos; to: CellPos }[] }
  | { t: 'refill'; drops: { at: CellPos; tile: Tile }[] }
  | { t: 'cascade'; step: number; multiplier: number; scoreDelta: number }
  | { t: 'shuffle'; reason: 'noMoves' }
  | { t: 'objectiveProgress'; index: number; progress: number; done: boolean }
  | { t: 'gameEnd'; result: 'won' | 'lost' };
