// src/ai-racer/core/types.ts

// ============================================================================
// Track Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface TrackSegment {
  centerLine: Point[];
  leftBoundary: Point[];
  rightBoundary: Point[];
  width: number;
}

export interface Track {
  centerLine: Point[];
  leftBoundary: Point[];
  rightBoundary: Point[];
  // All closed wall contours produced by offsetting the centerline. For a simple
  // loop this is [outerEdge, innerEdge]; a self-crossing track may yield more.
  // Used for collision walls and for filling the road surface.
  boundaries: Point[][];
  width: number;
  startLine: {
    start: Point;
    end: Point;
    angle: number; // Direction car should face at start
  };
  checkpoints: Point[]; // Evenly spaced points for fitness calculation
  totalLength: number;
  isClosed: boolean;
}

// ============================================================================
// Car Types
// ============================================================================

export interface CarState {
  id: number;
  x: number;
  y: number;
  angle: number; // Rotation in radians
  velocity: number; // Forward speed
  angularVelocity: number;
  steering: number; // Current steering input [-1, 1]
  acceleration: number; // Current accel input [0, 1]
  brake: number; // Current brake input [0, 1]
  alive: boolean;
  checkpointIndex: number; // Next checkpoint to pass
  checkpointsPassed: number;
  lapProgress: number; // 0-1 progress around track
  lapTime: number; // Current lap time in seconds
  bestLapTime: number;
  distanceTraveled: number;
  color: string;
}

// ============================================================================
// AI Types
// ============================================================================

export interface RacingObservation {
  sensorDistances: number[]; // 9 raycast distances, normalized [0, 1]
  velocity: number; // Normalized velocity [0, 1]
  angularVelocity: number; // Normalized angular velocity [-1, 1]
  steering: number; // Current steering [-1, 1]
  acceleration: number; // Current acceleration [0, 1]
}

export interface RacingAction {
  steering: number; // [-1, 1] left to right
  acceleration: number; // [0, 1] no gas to full gas
  brake: number; // [0, 1] no brake to full brake
}

export type RacingController = (observation: RacingObservation) => RacingAction;

// ============================================================================
// NEAT Types
// ============================================================================

export interface NEATConfig {
  populationSize: number;
  elitism: number; // Number of top performers to keep unchanged
  mutationRate: number;
  inputSize: number;
  outputSize: number;
}

export interface GenerationStats {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  speciesCount: number;
}

export interface SerializedGenome {
  json: string;
  fitness: number;
  generation: number;
}

// ============================================================================
// Game State Types
// ============================================================================

export type GameMode = 'draw' | 'watch-ai-learn' | 'time-trial' | 'live-race';

export interface GameState {
  mode: GameMode;
  track: Track | null;
  cars: CarState[];
  playerCar: CarState | null;
  generation: number;
  generationTime: number;
  maxGenerationTime: number;
  isRunning: boolean;
  isPaused: boolean;
  showSensors: boolean;
  showNetwork: boolean;
  fitnessHistory: number[];
}

// ============================================================================
// Constants
// ============================================================================

export const GAME_CONSTANTS = {
  // Canvas
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 600,

  // Car Physics (top-down kinematic model)
  CAR_WIDTH: 20, // across, perpendicular to travel
  CAR_LENGTH: 40, // nose-to-tail, along travel direction
  MAX_SPEED: 320, // px/s forward
  MAX_REVERSE_SPEED: 120, // px/s
  ACCELERATION_FORCE: 340, // px/s^2 throttle
  BRAKE_FORCE: 520, // px/s^2 braking / reverse
  DRAG: 0.9, // velocity decay per second (rolling + air resistance)
  TURN_SPEED: 3.4, // radians/s at full lock and full speed
  TURN_SPEED_REF: 80, // px/s at which full steering authority is reached

  // Sensors
  NUM_SENSORS: 9,
  SENSOR_ANGLES: [-90, -60, -45, -30, 0, 30, 45, 60, 90], // degrees
  MAX_SENSOR_DISTANCE: 200, // px

  // Track Drawing
  TRACK_WIDTH_DEFAULT: 80,
  TRACK_WIDTH_MIN: 40,
  TRACK_WIDTH_MAX: 150,
  SNAP_DISTANCE: 30, // px to snap to start
  MIN_POINTS_FOR_CLOSE: 15,
  PATH_SMOOTHING_ITERATIONS: 5,
  CHECKPOINT_SPACING: 70, // px between checkpoints (must exceed the checkpoint radius)
  CHECKPOINT_TIMEOUT: 4, // s a car may go without reaching a new checkpoint before it's killed

  // NEAT
  POPULATION_SIZE: 50,
  ELITISM_COUNT: 5,
  MUTATION_RATE: 0.3,
  MAX_GENERATION_TIME: 30, // seconds per generation

  // Physics
  FIXED_TIMESTEP: 1 / 60, // 60 Hz physics

  // Colors
  TRACK_GRASS_COLOR: 0x4a7c23,
  TRACK_ROAD_COLOR: 0x555555,
  TRACK_BORDER_COLOR: 0xffffff,
  CAR_COLORS: [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
  ],
} as const;

// ============================================================================
// AI / training configuration ("The Nerdy Stuff")
// ============================================================================

export interface AIConfig {
  hiddenSize: number; // neurons in the network's hidden layer (restart)
  mutationRate: number; // 0..1 (restart)
  elitism: number; // fraction of top genomes kept unchanged, 0..1 (restart)
  checkpointTimeout: number; // s without a new checkpoint before a car is killed (live)
  maxGenerationTime: number; // s per generation (live)
  simSpeed: number; // simulation sub-steps per frame while watching (live)
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  hiddenSize: 8,
  mutationRate: GAME_CONSTANTS.MUTATION_RATE,
  elitism: 0.1,
  checkpointTimeout: GAME_CONSTANTS.CHECKPOINT_TIMEOUT,
  maxGenerationTime: GAME_CONSTANTS.MAX_GENERATION_TIME,
  simSpeed: 4,
};

// ============================================================================
// Utility Types
// ============================================================================

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Line {
  start: Point;
  end: Point;
}
