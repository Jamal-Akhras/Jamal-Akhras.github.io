// src/ai-racer/core/Car.ts
import Matter from 'matter-js';
import type { CarState, RacingAction, RacingObservation, Track } from './types';
import { GAME_CONSTANTS } from './types';
import type { TrackCollision } from './TrackCollision';

export class Car {
  body: Matter.Body;
  state: CarState;
  sensorDistances: number[] = [];

  private static idCounter = 0;

  constructor(x: number, y: number, angle: number, color?: string) {
    const id = Car.idCounter++;

    // Create Matter.js body for the car. Length is along local +x so the body's
    // long axis matches the heading (cos/sin of angle).
    this.body = Matter.Bodies.rectangle(
      x,
      y,
      GAME_CONSTANTS.CAR_LENGTH,
      GAME_CONSTANTS.CAR_WIDTH,
      {
        label: `car-${id}`,
        frictionAir: 0.02,
        friction: 0.8,
        restitution: 0.2,
        angle: angle,
        collisionFilter: {
          category: 0x0002, // Car category
          mask: 0x0001, // Collides with walls only
        },
      }
    );

    // Initialize state
    this.state = {
      id,
      x,
      y,
      angle,
      velocity: 0,
      angularVelocity: 0,
      steering: 0,
      acceleration: 0,
      brake: 0,
      alive: true,
      checkpointIndex: 0,
      checkpointsPassed: 0,
      lapProgress: 0,
      lapTime: 0,
      bestLapTime: Infinity,
      distanceTraveled: 0,
      color: color || GAME_CONSTANTS.CAR_COLORS[id % GAME_CONSTANTS.CAR_COLORS.length],
    };

    // Initialize sensor distances
    this.sensorDistances = new Array(GAME_CONSTANTS.NUM_SENSORS).fill(1);
  }

  /**
   * Apply control inputs to the car
   */
  applyAction(action: RacingAction): void {
    if (!this.state.alive) return;

    this.state.steering = Math.max(-1, Math.min(1, action.steering));
    this.state.acceleration = Math.max(0, Math.min(1, action.acceleration));
    this.state.brake = Math.max(0, Math.min(1, action.brake));
  }

  /**
   * Update physics - called each frame before Matter.Engine.update().
   *
   * Top-down kinematic car model: we integrate a scalar forward speed and a
   * heading, then drive the Matter body directly (full grip, no sideways slide).
   * Matter is used only for collision separation and sensor geometry, so units
   * stay in clean px/s rather than fighting force-based dynamics.
   */
  update(dt: number): void {
    if (!this.state.alive) return;

    const C = GAME_CONSTANTS;

    // --- Longitudinal: integrate forward speed (px/s) ---
    let v = this.state.velocity;
    v += this.state.acceleration * C.ACCELERATION_FORCE * dt; // throttle
    v -= this.state.brake * C.BRAKE_FORCE * dt; // brake / reverse
    v -= v * C.DRAG * dt; // rolling + air drag
    v = Math.max(-C.MAX_REVERSE_SPEED, Math.min(C.MAX_SPEED, v));
    // Snap to rest when coasting to a near-stop so cars don't creep forever.
    if (this.state.acceleration === 0 && this.state.brake === 0 && Math.abs(v) < 2) {
      v = 0;
    }

    // --- Steering: authority grows with speed; reverse flips turn direction ---
    const turnAuthority = Math.min(1, Math.abs(v) / C.TURN_SPEED_REF);
    const yawRate = this.state.steering * C.TURN_SPEED * turnAuthority * Math.sign(v || 1);
    this.state.angle += yawRate * dt;

    // --- Integrate position along the heading ---
    const heading = { x: Math.cos(this.state.angle), y: Math.sin(this.state.angle) };
    const nextX = this.body.position.x + heading.x * v * dt;
    const nextY = this.body.position.y + heading.y * v * dt;

    // Drive the body directly; zero its velocity so Matter only resolves overlaps.
    Matter.Body.setPosition(this.body, { x: nextX, y: nextY });
    Matter.Body.setAngle(this.body, this.state.angle);
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.body, 0);

    // --- Sync state ---
    this.state.x = nextX;
    this.state.y = nextY;
    this.state.velocity = v;
    this.state.angularVelocity = yawRate;
    this.state.lapTime += dt;
    this.state.distanceTraveled += Math.abs(v) * dt;
  }

  /**
   * Update sensor readings by raycasting against the track collision grid.
   */
  updateSensors(collision: TrackCollision): void {
    if (!this.state.alive) {
      this.sensorDistances.fill(0);
      return;
    }

    const cx = this.body.position.x;
    const cy = this.body.position.y;
    const ca = this.body.angle;
    const MAX = GAME_CONSTANTS.MAX_SENSOR_DISTANCE;

    for (let i = 0; i < GAME_CONSTANTS.NUM_SENSORS; i++) {
      const a = ca + (GAME_CONSTANTS.SENSOR_ANGLES[i] * Math.PI) / 180;
      const dist = collision.raycast(cx, cy, Math.cos(a), Math.sin(a), MAX);
      this.sensorDistances[i] = dist / MAX;
    }
  }

  /**
   * Get observation for AI
   */
  getObservation(): RacingObservation {
    return {
      sensorDistances: [...this.sensorDistances],
      velocity: this.state.velocity / GAME_CONSTANTS.MAX_SPEED,
      angularVelocity: this.state.angularVelocity / 5, // Normalize
      steering: this.state.steering,
      acceleration: this.state.acceleration,
    };
  }

  /**
   * Check if car passed a checkpoint
   */
  updateCheckpoint(track: Track): void {
    if (!this.state.alive || track.checkpoints.length === 0) return;

    const nextCheckpoint = track.checkpoints[this.state.checkpointIndex];
    const dist = Math.sqrt(
      (this.state.x - nextCheckpoint.x) ** 2 +
      (this.state.y - nextCheckpoint.y) ** 2
    );

    // Check if within checkpoint radius
    if (dist < 30) {
      this.state.checkpointsPassed++;
      this.state.checkpointIndex = (this.state.checkpointIndex + 1) % track.checkpoints.length;

      // Check for lap completion
      if (this.state.checkpointIndex === 0 && this.state.checkpointsPassed > 0) {
        if (this.state.lapTime < this.state.bestLapTime) {
          this.state.bestLapTime = this.state.lapTime;
        }
        this.state.lapTime = 0;
      }
    }

    // Update lap progress
    this.state.lapProgress = this.state.checkpointIndex / track.checkpoints.length;
  }

  /**
   * Mark car as dead (crashed)
   */
  kill(): void {
    this.state.alive = false;
    Matter.Body.setStatic(this.body, true);
  }

  /**
   * Reset car to starting position
   */
  reset(x: number, y: number, angle: number): void {
    Matter.Body.setPosition(this.body, { x, y });
    Matter.Body.setAngle(this.body, angle);
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.body, 0);
    Matter.Body.setStatic(this.body, false);

    this.state.x = x;
    this.state.y = y;
    this.state.angle = angle;
    this.state.velocity = 0;
    this.state.angularVelocity = 0;
    this.state.steering = 0;
    this.state.acceleration = 0;
    this.state.brake = 0;
    this.state.alive = true;
    this.state.checkpointIndex = 0;
    this.state.checkpointsPassed = 0;
    this.state.lapProgress = 0;
    this.state.lapTime = 0;
    this.state.distanceTraveled = 0;
    this.sensorDistances.fill(1);
  }

  /**
   * Calculate fitness score for NEAT
   */
  getFitness(): number {
    let fitness = 0;

    // Primary: checkpoints passed
    fitness += this.state.checkpointsPassed * 100;

    // Secondary: progress toward next checkpoint
    fitness += this.state.lapProgress * 50;

    // Bonus: distance traveled (encourages movement)
    fitness += this.state.distanceTraveled * 0.1;

    // Bonus: average speed
    if (this.state.lapTime > 0) {
      const avgSpeed = this.state.distanceTraveled / this.state.lapTime;
      fitness += avgSpeed * 0.5;
    }

    return Math.max(0, fitness);
  }

  static resetIdCounter(): void {
    Car.idCounter = 0;
  }
}
