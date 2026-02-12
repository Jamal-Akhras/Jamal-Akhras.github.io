// src/ai-racer/core/Car.ts
import Matter from 'matter-js';
import type { CarState, RacingAction, RacingObservation, Point, Track } from './types';
import { GAME_CONSTANTS } from './types';

export class Car {
  body: Matter.Body;
  state: CarState;
  sensorDistances: number[] = [];

  private static idCounter = 0;

  constructor(x: number, y: number, angle: number, color?: string) {
    const id = Car.idCounter++;

    // Create Matter.js body for the car
    this.body = Matter.Bodies.rectangle(
      x,
      y,
      GAME_CONSTANTS.CAR_WIDTH,
      GAME_CONSTANTS.CAR_HEIGHT,
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
   * Update physics - called each frame before Matter.Engine.update()
   */
  update(dt: number): void {
    if (!this.state.alive) return;

    // Sync state from Matter.js body
    this.state.x = this.body.position.x;
    this.state.y = this.body.position.y;
    this.state.angle = this.body.angle;
    this.state.angularVelocity = this.body.angularVelocity;

    // Calculate forward velocity (velocity in direction of car heading)
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    const forwardX = Math.cos(this.body.angle);
    const forwardY = Math.sin(this.body.angle);
    this.state.velocity = vx * forwardX + vy * forwardY;

    // Apply steering (only when moving)
    const speedFactor = Math.min(1, Math.abs(this.state.velocity) / 50);
    const steerAngle = this.state.steering * GAME_CONSTANTS.TURN_SPEED * speedFactor * dt;
    Matter.Body.setAngularVelocity(this.body, steerAngle / dt * 0.5);

    // Apply acceleration force
    if (this.state.acceleration > 0 && this.state.velocity < GAME_CONSTANTS.MAX_SPEED) {
      const force = this.state.acceleration * GAME_CONSTANTS.ACCELERATION_FORCE * dt * 0.001;
      Matter.Body.applyForce(this.body, this.body.position, {
        x: forwardX * force,
        y: forwardY * force,
      });
    }

    // Apply braking
    if (this.state.brake > 0) {
      const brakeForce = this.state.brake * GAME_CONSTANTS.BRAKE_FORCE * dt * 0.001;
      const currentSpeed = Math.sqrt(vx * vx + vy * vy);
      if (currentSpeed > 0.1) {
        const brakeFactor = Math.min(brakeForce / currentSpeed, 1);
        Matter.Body.setVelocity(this.body, {
          x: vx * (1 - brakeFactor),
          y: vy * (1 - brakeFactor),
        });
      }
    }

    // Apply friction when not accelerating (simulate engine braking)
    if (this.state.acceleration === 0 && this.state.brake === 0) {
      Matter.Body.setVelocity(this.body, {
        x: vx * GAME_CONSTANTS.FRICTION,
        y: vy * GAME_CONSTANTS.FRICTION,
      });
    }

    // Update lap time
    this.state.lapTime += dt;

    // Track distance traveled
    this.state.distanceTraveled += Math.abs(this.state.velocity) * dt;
  }

  /**
   * Update sensor readings by raycasting against track walls
   */
  updateSensors(wallBodies: Matter.Body[]): void {
    if (!this.state.alive) {
      this.sensorDistances.fill(0);
      return;
    }

    const carX = this.body.position.x;
    const carY = this.body.position.y;
    const carAngle = this.body.angle;

    for (let i = 0; i < GAME_CONSTANTS.NUM_SENSORS; i++) {
      const sensorAngle = carAngle + (GAME_CONSTANTS.SENSOR_ANGLES[i] * Math.PI) / 180;
      const endX = carX + Math.cos(sensorAngle) * GAME_CONSTANTS.MAX_SENSOR_DISTANCE;
      const endY = carY + Math.sin(sensorAngle) * GAME_CONSTANTS.MAX_SENSOR_DISTANCE;

      // Raycast against all wall bodies
      const rayStart = { x: carX, y: carY };
      const rayEnd = { x: endX, y: endY };

      let minDist: number = GAME_CONSTANTS.MAX_SENSOR_DISTANCE;

      for (const wall of wallBodies) {
        const collisions = Matter.Query.ray([wall], rayStart, rayEnd);
        for (const collision of collisions) {
          if (collision.bodyA === wall || collision.bodyB === wall) {
            // Calculate intersection point
            const intersections = this.rayBodyIntersection(rayStart, rayEnd, wall);
            for (const intersection of intersections) {
              const dist = Math.sqrt(
                (intersection.x - carX) ** 2 + (intersection.y - carY) ** 2
              );
              if (dist < minDist) {
                minDist = dist;
              }
            }
          }
        }
      }

      // Normalize to [0, 1]
      this.sensorDistances[i] = minDist / GAME_CONSTANTS.MAX_SENSOR_DISTANCE;
    }
  }

  /**
   * Get intersection points between a ray and a body's vertices
   */
  private rayBodyIntersection(
    rayStart: Point,
    rayEnd: Point,
    body: Matter.Body
  ): Point[] {
    const intersections: Point[] = [];
    const vertices = body.vertices;

    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];

      const intersection = this.lineIntersection(
        rayStart.x, rayStart.y, rayEnd.x, rayEnd.y,
        v1.x, v1.y, v2.x, v2.y
      );

      if (intersection) {
        intersections.push(intersection);
      }
    }

    return intersections;
  }

  /**
   * Calculate intersection point of two line segments
   */
  private lineIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): Point | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
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

  /**
   * Get car corners for rendering
   */
  getCorners(): Point[] {
    return this.body.vertices.map(v => ({ x: v.x, y: v.y }));
  }

  static resetIdCounter(): void {
    Car.idCounter = 0;
  }
}
