// src/ai-racer/ai/NEATController.ts
// @ts-nocheck - neataptic doesn't have TypeScript types
import neataptic from 'neataptic';
import type { RacingObservation, RacingAction, GenerationStats } from '../core/types';
import { GAME_CONSTANTS } from '../core/types';

const { Neat, architect } = neataptic;

// Neural network input/output sizes
const INPUT_SIZE = GAME_CONSTANTS.NUM_SENSORS + 4; // sensors + velocity + angVel + steering + acceleration
const OUTPUT_SIZE = 3; // steering, acceleration, brake

export class NEATController {
  private neat: any;
  private generation: number = 0;
  private bestFitness: number = 0;
  private fitnessHistory: number[] = [];

  constructor(populationSize: number = GAME_CONSTANTS.POPULATION_SIZE) {
    // Create NEAT instance
    this.neat = new Neat(
      INPUT_SIZE,
      OUTPUT_SIZE,
      null, // No fitness function - we'll set scores manually
      {
        popsize: populationSize,
        elitism: Math.floor(populationSize * 0.1),
        mutationRate: 0.3,
        mutationAmount: 2,
        selection: neataptic.methods.selection.TOURNAMENT,
        mutation: [
          neataptic.methods.mutation.ADD_NODE,
          neataptic.methods.mutation.ADD_CONN,
          neataptic.methods.mutation.MOD_WEIGHT,
          neataptic.methods.mutation.MOD_BIAS,
          neataptic.methods.mutation.SUB_NODE,
          neataptic.methods.mutation.SUB_CONN,
        ],
        network: new architect.Random(INPUT_SIZE, 4, OUTPUT_SIZE),
      }
    );
  }

  /**
   * Get the current population of neural networks
   */
  getPopulation(): any[] {
    return this.neat.population;
  }

  /**
   * Get a controller function for a specific genome index
   */
  getController(index: number): (obs: RacingObservation) => RacingAction {
    const genome = this.neat.population[index];
    if (!genome) {
      throw new Error(`No genome at index ${index}`);
    }

    return (obs: RacingObservation): RacingAction => {
      // Prepare input array
      const input = [
        ...obs.sensorDistances, // 9 sensor distances
        obs.velocity,
        obs.angularVelocity,
        obs.steering,
        obs.acceleration,
      ];

      // Activate network
      const output = genome.activate(input);

      // Map outputs to action
      return {
        steering: output[0] * 2 - 1, // Map [0,1] to [-1,1]
        acceleration: output[1],      // Already [0,1]
        brake: output[2] * 0.5,       // Scale down brake to prevent over-braking
      };
    };
  }

  /**
   * Set fitness score for a genome
   */
  setFitness(index: number, fitness: number): void {
    if (this.neat.population[index]) {
      this.neat.population[index].score = fitness;
    }
  }

  /**
   * Evolve to the next generation
   */
  evolve(): GenerationStats {
    // Sort population by fitness
    this.neat.sort();

    // Get stats before evolution
    const scores = this.neat.population.map((g: any) => g.score || 0);
    this.bestFitness = Math.max(...scores);
    const avgFitness = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const worstFitness = Math.min(...scores);

    this.fitnessHistory.push(this.bestFitness);

    // Create new generation
    const newPopulation: any[] = [];

    // Elitism: keep top performers
    const eliteCount = Math.floor(this.neat.popsize * 0.1);
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(this.neat.population[i]);
    }

    // Generate rest through crossover and mutation
    while (newPopulation.length < this.neat.popsize) {
      // Tournament selection
      const parent1 = this.tournamentSelect();
      const parent2 = this.tournamentSelect();

      // Crossover
      const child = neataptic.Network.crossOver(parent1, parent2);

      // Mutation
      child.mutate(this.neat.mutation[Math.floor(Math.random() * this.neat.mutation.length)]);

      newPopulation.push(child);
    }

    this.neat.population = newPopulation;
    this.generation++;

    return {
      generation: this.generation,
      bestFitness: this.bestFitness,
      avgFitness,
      worstFitness,
      speciesCount: 1, // NEAT doesn't track species in neataptic by default
    };
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(): any {
    const tournamentSize = 3;
    let best = null;
    let bestScore = -Infinity;

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.neat.population.length);
      const genome = this.neat.population[idx];
      if (genome.score > bestScore) {
        bestScore = genome.score;
        best = genome;
      }
    }

    return best || this.neat.population[0];
  }

  /**
   * Get current generation number
   */
  getGeneration(): number {
    return this.generation;
  }

  /**
   * Get best fitness achieved
   */
  getBestFitness(): number {
    return this.bestFitness;
  }

  /**
   * Get fitness history
   */
  getFitnessHistory(): number[] {
    return [...this.fitnessHistory];
  }

  /**
   * Get the best performing genome
   */
  getBestGenome(): any {
    this.neat.sort();
    return this.neat.population[0];
  }

  /**
   * Serialize the best genome for saving
   */
  serializeBest(): string {
    const best = this.getBestGenome();
    return JSON.stringify(best.toJSON());
  }

  /**
   * Load a genome from serialized data
   */
  loadGenome(serialized: string): any {
    const json = JSON.parse(serialized);
    return neataptic.Network.fromJSON(json);
  }

  /**
   * Create a controller from a serialized genome
   */
  createControllerFromSerialized(serialized: string): (obs: RacingObservation) => RacingAction {
    const genome = this.loadGenome(serialized);

    return (obs: RacingObservation): RacingAction => {
      const input = [
        ...obs.sensorDistances,
        obs.velocity,
        obs.angularVelocity,
        obs.steering,
        obs.acceleration,
      ];

      const output = genome.activate(input);

      return {
        steering: output[0] * 2 - 1,
        acceleration: output[1],
        brake: output[2] * 0.5,
      };
    };
  }

  /**
   * Get population size
   */
  getPopulationSize(): number {
    return this.neat.popsize;
  }

  /**
   * Reset the controller
   */
  reset(): void {
    this.generation = 0;
    this.bestFitness = 0;
    this.fitnessHistory = [];

    // Reinitialize population
    this.neat.population = [];
    for (let i = 0; i < this.neat.popsize; i++) {
      this.neat.population.push(new architect.Random(INPUT_SIZE, 4, OUTPUT_SIZE));
    }
  }
}
