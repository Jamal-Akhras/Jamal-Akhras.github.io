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

  // Car Physics
  CAR_WIDTH: 20,
  CAR_HEIGHT: 40,
  MAX_SPEED: 300, // px/s
  ACCELERATION_FORCE: 200, // px/s^2
  BRAKE_FORCE: 400, // px/s^2
  FRICTION: 0.98, // velocity multiplier per frame
  ANGULAR_FRICTION: 0.92, // angular velocity multiplier
  TURN_SPEED: 3.5, // radians/s at max steering

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
  CHECKPOINT_SPACING: 50, // px between checkpoints

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
