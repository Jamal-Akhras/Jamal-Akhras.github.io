// src/dino-game/DinoGame.tsx
import { useEffect, useRef, useState } from 'react';
import type { Action, AIObservation } from './ai/types';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 240;
const FLOOR_Y = GAME_HEIGHT - 40;

const DINO_WIDTH = 30;
const DINO_HEIGHT = 36;
const DINO_DUCK_HEIGHT = 22;
const DINO_X = 50;

const GRAVITY = 2000;
const JUMP_VELOCITY = -620;

const BASE_SPEED = 260;
const SPEED_ACCEL = 12;
const MAX_SPEED = 12500;

const SPAWN_MIN_GAP = 240;
const SPAWN_VAR_GAP = 160;

const BIRD_MIN_SPEED = 340;
const BIRD_MIN_SCORE = 20;
const BIRD_MIN_GAP = 260;
const BIRD_VAR_GAP = 220;
const BIRD_WIDTH = 44;
const BIRD_HEIGHT = 24;

const SAFE_BASE_GAP = 120;
const SAFE_GAP_SPEED_SCALE = 1;
const EXTRA_LOW_BIRD_AFTER_TALL_CACTUS = 40;
const EXTRA_CACTUS_AFTER_LOW_BIRD = 24;
const TALL_CACTUS_H = 42;

const THEME_SWITCH_POINTS = 25;
const THEME_FADE_SPEED = 0.9;

const SWIPE_THRESHOLD = 30;
const TAP_TIME_THRESHOLD = 200;

/* ===================== Recording / Replay types ===================== */
export type RecordingFrame = { t: number; action: Action };
export type Recording = {
  seed: number;
  frames: RecordingFrame[];
  duration: number;
  meta?: Record<string, unknown>;
};
/* ===================================================================== */

interface BaseObstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  yTop: number;
  passed: boolean;
}

type Obstacle =
  | (BaseObstacle & { kind: 'cactus' })
  | (BaseObstacle & { kind: 'bird'; altitudeIdx: 0 | 1 | 2 });

interface GameState {
  dinoY: number;
  dinoVy: number;
  ducking: boolean;
  speed: number;
  score: number;
  highScore: number;
  obstacles: Obstacle[];
  running: boolean;
  gameOver: boolean;
  seed: number;
  nightTarget: boolean;
  themeT: number;
  nextThemeScore: number;
}

function createLCG(seed: number) {
  let s = seed >>> 0;
  return function rand(): number {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function aabbOverlap(
  a: { l: number; r: number; t: number; b: number },
  b: { l: number; r: number; t: number; b: number }
) {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColorHex(a: string, b: string, t: number) {
  const ai = parseInt(a.slice(1), 16);
  const bi = parseInt(b.slice(1), 16);
  const ar = (ai >> 16) & 255,
    ag = (ai >> 8) & 255,
    ab = ai & 255;
  const br = (bi >> 16) & 255,
    bg = (bi >> 8) & 255,
    bb = bi & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/* ================= Observations for main and ghost ================= */
function makeObservationAtX(st: GameState, atX: number): AIObservation {
  const ahead = st.obstacles
    .filter(o => o.x + o.width >= atX)
    .sort((a, b) => a.x - b.x)
    .slice(0, 3)
    .map(o => ({
      dx: o.x - atX,
      width: o.width,
      height: o.height,
      yTop: o.yTop,
      kind: o.kind,
    }));
  return {
    dinoY: st.dinoY,
    dinoVy: st.dinoVy,
    ducking: st.ducking,
    speed: st.speed,
    score: st.score,
    obstacles: ahead,
  };
}
function makeObservation(st: GameState): AIObservation {
  return makeObservationAtX(st, DINO_X);
}

function makeGhostObservationAtX(
  st: GameState,
  ghost: GhostState,
  atX: number
): AIObservation {
  const obs = makeObservationAtX(st, atX);
  return {
    ...obs,
    dinoY: ghost.y,
    dinoVy: ghost.vy,
    ducking: ghost.ducking,
    score: ghost.score,
  };
}
/* =================================================================== */

/* =============================== Ghost state =============================== */
type GhostState = {
  y: number;
  vy: number;
  ducking: boolean;
  score: number;
  alive: boolean;
};
/* ========================================================================== */

export default function DinoGame(
  {
    controller,
    onEpisodeEnd,
    seed,
    autoStart,
    ghostController,
    showGhost = false,
    ghostLeadPx = 16,
    ghostRenderOffsetPx = 0,
    speedCapMultiplier = 1,
    playerColor = '#22d3ee',
    disableUserControl = false,
    recordRun = false,
    onRecordingComplete,
    replay = null,
  }: {
    controller?: (obs: AIObservation) => Action;
    onEpisodeEnd?: (score: number, seed: number) => void;
    seed?: number;
    autoStart?: boolean;
    ghostController?: (obs: AIObservation) => Action;
    showGhost?: boolean;
    ghostLeadPx?: number;
    ghostRenderOffsetPx?: number;
    speedCapMultiplier?: number;
    playerColor?: string;
    disableUserControl?: boolean;
    recordRun?: boolean;
    onRecordingComplete?: (rec: Recording) => void;
    replay?: Recording | null;
  } = {}
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const spawnGapLeftRef = useRef<number>(SPAWN_MIN_GAP);
  const birdGapLeftRef = useRef<number>(BIRD_MIN_GAP);
  const nextIdRef = useRef<number>(1);
  const randRef = useRef<() => number>(() => Math.random());

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [state, setState] = useState<GameState>({
    dinoY: FLOOR_Y - DINO_HEIGHT,
    dinoVy: 0,
    ducking: false,
    speed: BASE_SPEED,
    score: 0,
    highScore: 0,
    obstacles: [],
    running: false,
    gameOver: false,
    seed: (seed ?? Math.floor(Math.random() * 1e9)) >>> 0,
    nightTarget: false,
    themeT: 0,
    nextThemeScore: THEME_SWITCH_POINTS,
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Ghost refs
  const ghostRef = useRef<GhostState>({
    y: FLOOR_Y - DINO_HEIGHT,
    vy: 0,
    ducking: false,
    score: 0,
    alive: true,
  });
  const ghostPassedRef = useRef<Set<number>>(new Set());

  // Replay / record timers
  const elapsedRef = useRef(0);
  const recordingRef = useRef<Recording | null>(null);

  const resetSeedRef = useRef<() => void>(() => {});
  resetSeedRef.current = () => {
    randRef.current = createLCG(state.seed);
    genStars();
  };

  useEffect(() => {
    resetSeedRef.current();
  }, [state.seed]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handleKeyDownRef.current = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (disableUserControl) {
      if (e.key === 'p') togglePause();
      if (e.key === 'r') restart();
      return;
    }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
      e.preventDefault();
      const st = stateRef.current;
      if (!st.running) {
        restart();
      } else {
        const dinoHeight = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
        const onGround = st.dinoY >= FLOOR_Y - dinoHeight - 0.5;
        if (onGround) st.dinoVy = JUMP_VELOCITY;
      }
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      if (stateRef.current.running) stateRef.current.ducking = true;
    } else if (e.key === 'p') {
      togglePause();
    } else if (e.key === 'r') {
      restart();
    }
  };

  const handleKeyUpRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handleKeyUpRef.current = (e: KeyboardEvent) => {
    if (disableUserControl) return;
    if (e.key === 'ArrowDown' || e.key === 's') {
      stateRef.current.ducking = false;
    }
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      handleKeyDownRef.current(e);
    }
    function onKeyUp(e: KeyboardEvent) {
      handleKeyUpRef.current(e);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Seed + autoStart management (also respected during replay)
  const syncSeedAndAutoStartRef = useRef<() => void>(() => {});
  syncSeedAndAutoStartRef.current = () => {
    const st = stateRef.current;
    if (typeof seed === 'number' && (seed >>> 0) !== st.seed) {
      const newSeed = seed >>> 0;
      stateRef.current.seed = newSeed;
      setState(s => ({ ...s, seed: newSeed }));
      randRef.current = createLCG(newSeed);
      genStars();
      restart();
      return;
    }
    if (autoStart && !st.running) {
      if (st.gameOver) restart(); else start();
    }
  };

  useEffect(() => {
    syncSeedAndAutoStartRef.current();
  }, [seed, autoStart]);

  function start() {
    if (stateRef.current.running) return;
    setState(s => ({ ...s, running: true, gameOver: false }));
    lastTsRef.current = null;
    spawnGapLeftRef.current = SPAWN_MIN_GAP;
    birdGapLeftRef.current = BIRD_MIN_GAP;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  function togglePause() {
    const st = stateRef.current;
    if (st.running) {
      setState(s => ({ ...s, running: false }));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    } else if (!st.gameOver) {
      start();
    }
  }

  function restart() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const highScore = Math.max(stateRef.current.highScore, stateRef.current.score);
    const s = stateRef.current.seed;

    const fresh: GameState = {
      dinoY: FLOOR_Y - DINO_HEIGHT,
      dinoVy: 0,
      ducking: false,
      speed: BASE_SPEED,
      score: 0,
      highScore,
      obstacles: [],
      running: true,
      gameOver: false,
      seed: s,
      nightTarget: false,
      themeT: 0,
      nextThemeScore: THEME_SWITCH_POINTS,
    };
    stateRef.current = fresh;
    setState(fresh);

    // reset ghost
    ghostRef.current = {
      y: FLOOR_Y - DINO_HEIGHT,
      vy: 0,
      ducking: false,
      score: 0,
      alive: true,
    };
    ghostPassedRef.current = new Set();

    lastTsRef.current = null;
    spawnGapLeftRef.current = SPAWN_MIN_GAP;
    birdGapLeftRef.current = BIRD_MIN_GAP;
    randRef.current = createLCG(s);
    genStars();

    // reset replay/record timers
    elapsedRef.current = 0;

    // (Re)start recording if requested
    recordingRef.current = recordRun
      ? { seed: s, frames: [], duration: 0 }
      : null;

    rafRef.current = requestAnimationFrame(loop);
  }

  function getLastObstacle(): Obstacle | null {
    const arr = stateRef.current.obstacles;
    if (arr.length === 0) return null;
    let last = arr[0];
    for (const o of arr) if (o.x > last.x) last = o;
    return last;
  }

  function minSafeGap(
    speed: number,
    prev: Obstacle | null,
    nextKind: 'cactus' | 'bird',
    nextAltIdx?: 0 | 1 | 2
  ) {
    let g = SAFE_BASE_GAP + Math.max(0, speed - BASE_SPEED) * SAFE_GAP_SPEED_SCALE;
    if (prev) {
      if (prev.kind === 'cactus' && nextKind === 'bird' && nextAltIdx === 0) {
        const tall = prev.height >= TALL_CACTUS_H;
        g += tall ? EXTRA_LOW_BIRD_AFTER_TALL_CACTUS : Math.floor(EXTRA_LOW_BIRD_AFTER_TALL_CACTUS * 0.6);
      }
      if (prev.kind === 'bird' && nextKind === 'cactus') {
        const prevLow = prev.yTop >= FLOOR_Y - (BIRD_HEIGHT + 42) - 0.5;
        if (prevLow) g += EXTRA_CACTUS_AFTER_LOW_BIRD;
      }
    }
    return g;
  }

  function loop(ts: number) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    let dt = 0;
    if (lastTsRef.current !== null) {
      dt = (ts - lastTsRef.current) / 1000;
      if (dt > 0.05) dt = 0.05;
    }
    lastTsRef.current = ts;

    const step = 1 / 60;
    let acc = dt;
    while (acc > 0 && stateRef.current.running) {
      const h = Math.min(step, acc);
      simStep(h);
      acc -= h;
    }

    render(ctx);

    if (stateRef.current.running) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  // Pull action from a recording at current elapsed time
  function actionFromReplay(elapsed: number, rec: Recording): Action {
    if (!rec.frames.length) return { jump: false, duck: false };
    const idx = Math.min(Math.floor(elapsed * 60), rec.frames.length - 1);
    return rec.frames[idx].action || { jump: false, duck: false };
  }

  function simStep(dt: number) {
    const st = stateRef.current;
    if (!st.running) return;

    elapsedRef.current += dt;

    // ===== Main dino control (player or AI or replay) =====
    let applied: Action | null = null;

    if (replay) {
      applied = actionFromReplay(elapsedRef.current, replay);
      st.ducking = !!applied.duck;
      const dH = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      const onGround = st.dinoY >= FLOOR_Y - dH - 0.5;
      if (applied.jump && onGround) st.dinoVy = JUMP_VELOCITY;
    } else if (controller) {
      const obs = makeObservation(st);
      const a = controller(obs) || { jump: false, duck: false };
      applied = a;
      st.ducking = !!a.duck;
      const dH = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      const onGround = st.dinoY >= FLOOR_Y - dH - 0.5;
      if (a.jump && onGround) st.dinoVy = JUMP_VELOCITY;
    } else {
      const jumpThisFrame = st.dinoVy === JUMP_VELOCITY;
      applied = { jump: jumpThisFrame, duck: st.ducking };
    }

    // ===== Ghost control (independent; never triggers game over) =====
    if (showGhost && ghostController && ghostRef.current.alive) {
      const g = ghostRef.current;
      const ghostX = DINO_X + ghostLeadPx;
      const ghObs = makeGhostObservationAtX(st, g, ghostX);
      const ga = ghostController(ghObs) || { jump: false, duck: false };

      g.ducking = !!ga.duck;

      const ghH = g.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      const ghOnGround = g.y >= FLOOR_Y - ghH - 0.5;
      if (ga.jump && ghOnGround) g.vy = JUMP_VELOCITY;

      // Ghost physics (own y/vy only)
      g.vy += GRAVITY * dt;
      g.y += g.vy * dt;
      const ghGround = FLOOR_Y - ghH;
      if (g.y > ghGround) {
        g.y = ghGround;
        g.vy = 0;
      }

      // Ghost scoring: count obstacles when they pass ghost X
      let passed = 0;
      for (const o of st.obstacles) {
        const oRight = o.x + o.width;
        if (oRight < ghostX - 2 && !ghostPassedRef.current.has(o.id)) {
          ghostPassedRef.current.add(o.id);
          passed += 1;
        }
      }
      g.score += passed;
      g.score += dt * 0.5;
      // Optional: ghost collision (purely to stop it if desired)
      const gRect = { l: ghostX, r: ghostX + DINO_WIDTH, t: g.y, b: g.y + ghH };
      for (const o of st.obstacles) {
        const oRect = { l: o.x, r: o.x + o.width, t: o.yTop, b: o.yTop + o.height };
        if (aabbOverlap(gRect, oRect)) {
          g.alive = false;
          break;
        }
      }
    }

    // ===== Speed, physics, spawns for the world =====
    st.speed = Math.min(MAX_SPEED * speedCapMultiplier, st.speed + SPEED_ACCEL * dt);

    const dinoHeight = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    st.dinoVy += GRAVITY * dt;
    st.dinoY += st.dinoVy * dt;
    const groundTop = FLOOR_Y - dinoHeight;
    if (st.dinoY > groundTop) {
      st.dinoY = groundTop;
      st.dinoVy = 0;
    }

    const dx = -st.speed * dt;
    let passedThisFrame = 0;

    st.obstacles.forEach(o => {
      o.x += dx;
      const oRight = o.x + o.width;
      if (!o.passed && oRight < DINO_X - 2) {
        o.passed = true;
        passedThisFrame += 1;
      }
    });

    st.obstacles = st.obstacles.filter(o => o.x + o.width > -20);

    spawnGapLeftRef.current += dx;
    if (spawnGapLeftRef.current <= 0) {
      spawnCactusCluster();
      const r = randRef.current();
      const nextGap = SPAWN_MIN_GAP + Math.floor(r * SPAWN_VAR_GAP);
      spawnGapLeftRef.current = nextGap;
    }

    birdGapLeftRef.current += dx;
    if (st.speed >= BIRD_MIN_SPEED && st.score >= BIRD_MIN_SCORE && birdGapLeftRef.current <= 0) {
      spawnBird();
      const r = randRef.current();
      const nextGap = BIRD_MIN_GAP + Math.floor(r * BIRD_VAR_GAP);
      birdGapLeftRef.current = nextGap;
    }

    // ===== Collision for main player only =====
    const dinoRect = { l: DINO_X, r: DINO_X + DINO_WIDTH, t: st.dinoY, b: st.dinoY + dinoHeight };
    let collided = false;
    for (const o of st.obstacles) {
      const oRect = { l: o.x, r: o.x + o.width, t: o.yTop, b: o.yTop + o.height };
      if (aabbOverlap(dinoRect, oRect)) { collided = true; break; }
    }

    if (collided) {
      stateRef.current.running = false;
      st.running = false;

      // finalize recording
      if (recordingRef.current) {
        recordingRef.current.duration = elapsedRef.current;
        onRecordingComplete?.(recordingRef.current);
      }

      setState(s => ({
        ...s,
        running: false,
        gameOver: true,
        highScore: Math.max(s.highScore, s.score),
      }));
      if (onEpisodeEnd) {
        try {
          onEpisodeEnd(Math.floor(st.score), st.seed);
        } catch {
          // Consumer callbacks must not interrupt cleanup after a collision.
        }
      }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }

    if (passedThisFrame > 0) st.score += passedThisFrame;
    st.score += dt * 0.5;

    if (st.score >= st.nextThemeScore) {
      st.nightTarget = !st.nightTarget;
      st.nextThemeScore += THEME_SWITCH_POINTS;
    }
    const dir = st.nightTarget ? 1 : -1;
    st.themeT = clamp01(st.themeT + dir * THEME_FADE_SPEED * dt);

    // ===== Record frame (main dino only) =====
    if (recordingRef.current && applied) {
      recordingRef.current.frames.push({ t: elapsedRef.current, action: { jump: !!applied.jump, duck: !!applied.duck } });
    }

    // ===== Throttled UI snapshot =====
    snapshotEvery(1 / 30, () => {
      setState(s => ({
        ...s,
        dinoY: st.dinoY,
        dinoVy: st.dinoVy,
        ducking: st.ducking,
        speed: st.speed,
        score: st.score,
        obstacles: [...st.obstacles],
        nightTarget: st.nightTarget,
        themeT: st.themeT,
        nextThemeScore: st.nextThemeScore,
      }));
    });
  }

  const snapTimer = useRef(0);
  function snapshotEvery(period: number, fn: () => void) {
    snapTimer.current += 1 / 60;
    if (snapTimer.current >= period) {
      snapTimer.current = 0;
      fn();
    }
  }

  function spawnCactusCluster() {
    const st = stateRef.current;
    const r = randRef.current();

    const large = r < 0.45;
    const baseH = large ? 46 : 32;
    const baseW = large ? 12 : 10;

    const r2 = randRef.current();
    const clusterSize = r2 < 0.55 ? 1 : r2 < 0.85 ? 2 : 3;

    const gapMin = 12, gapVar = 10;

    const last = getLastObstacle();
    const required = minSafeGap(st.speed, last, 'cactus');
    let x = Math.max(GAME_WIDTH + 20, last ? last.x + last.width + required : GAME_WIDTH + 20);

    for (let i = 0; i < clusterSize; i++) {
      const wJitter = Math.floor(randRef.current() * 3);
      const hJitter = Math.floor(randRef.current() * 3);
      const width = baseW + wJitter;
      const height = baseH + hJitter;
      const yTop = FLOOR_Y - height;
      stateRef.current.obstacles.push({ id: nextIdRef.current++, x, width, height, yTop, passed: false, kind: 'cactus' });

      const innerGap = gapMin + Math.floor(randRef.current() * gapVar);
      x += width + innerGap;
    }

    const footprint = (baseW + 14) * clusterSize;
    spawnGapLeftRef.current += footprint * 0.6;
  }

  function spawnBird() {
    const st = stateRef.current;
    const rnd = randRef.current;

    const altitudes = [
      FLOOR_Y - (BIRD_HEIGHT + 30),
      FLOOR_Y - (BIRD_HEIGHT + 50),
      FLOOR_Y - (BIRD_HEIGHT + 75),
    ];
    const altitudeIdx = Math.floor(rnd() * altitudes.length) as 0 | 1 | 2;
    const yTop = altitudes[altitudeIdx];

    const width = BIRD_WIDTH + Math.floor(rnd() * 3) - 1;
    const height = BIRD_HEIGHT;

    const last = getLastObstacle();
    const required = minSafeGap(st.speed, last, 'bird', altitudeIdx);
    const x = Math.max(GAME_WIDTH + 20, last ? last.x + last.width + required : GAME_WIDTH + 20);

    stateRef.current.obstacles.push({ id: nextIdRef.current++, x, width, height, yTop, passed: false, kind: 'bird', altitudeIdx });
  }

  type Star = { x: number; y: number; tw: number };
  const starsRef = useRef<Star[]>([]);
  function genStars() {
    const stars: Star[] = [];
    const rnd = randRef.current;
    const count = 40;
    for (let i = 0; i < count; i++) {
      stars.push({ x: Math.floor(rnd() * GAME_WIDTH), y: Math.floor(rnd() * (FLOOR_Y - 20)), tw: rnd() * Math.PI * 2 });
    }
    starsRef.current = stars;
  }

  function render(ctx: CanvasRenderingContext2D) {
    const st = stateRef.current;

    const daySky = '#f8fafc';
    const nightSky = '#0b0e1a';
    const sky = lerpColorHex(daySky, nightSky, st.themeT);

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (st.themeT > 0) {
      ctx.fillStyle = '#e2e8f0';
      for (const s of starsRef.current) {
        const tw = 0.5 + 0.5 * Math.sin(performance.now() / 800 + s.tw);
        ctx.globalAlpha = st.themeT * (0.6 + 0.4 * tw);
        ctx.fillRect(s.x, s.y, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    const groundDay = '#94a3b8';
    const groundNight = '#334155';
    ctx.fillStyle = lerpColorHex(groundDay, groundNight, st.themeT);
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 2);

    const obsDay = '#0f172a';
    const obsNight = '#eab308';
    const obsColor = lerpColorHex(obsDay, obsNight, st.themeT * 0.5);

    for (const o of st.obstacles) {
      if (o.kind === 'cactus') {
        ctx.fillStyle = obsColor;
        ctx.fillRect(o.x, o.yTop, o.width, o.height);
      } else {
        ctx.fillStyle = obsColor;
        ctx.fillRect(o.x, o.yTop + 6, o.width, o.height - 12);
        ctx.fillRect(o.x + o.width - 10, o.yTop + 4, 8, 8);

        const flap = Math.sin(performance.now() / 120 + o.id) > 0 ? 'up' : 'down';
        if (flap === 'up') {
          ctx.fillRect(o.x + 6, o.yTop + 0, o.width - 20, 6);
        } else {
          ctx.fillRect(o.x + 6, o.yTop + o.height - 6, o.width - 20, 6);
        }
      }
    }

    // Main dino
    const dinoHeight = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    ctx.fillStyle = playerColor;
    ctx.fillRect(DINO_X, st.dinoY, DINO_WIDTH, dinoHeight);
    ctx.fillStyle = st.themeT < 0.5 ? '#0f172a' : '#cbd5e1';
    ctx.fillRect(DINO_X + 10, st.dinoY + 8, 4, 4);

    // Ghost (semi-transparent red)
    if (showGhost) {
      const g = ghostRef.current;
      const ghH = g.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      const gx = DINO_X + ghostRenderOffsetPx;
      ctx.globalAlpha = g.alive ? 0.6 : 0.25;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(gx, g.y, DINO_WIDTH, ghH);
      ctx.fillStyle = '#111827';
      ctx.fillRect(gx + 10, g.y + 8, 4, 4);
      ctx.globalAlpha = 1;
    }

    // HUD
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = st.themeT < 0.5 ? '#0f172a' : '#cbd5e1';
    const hud = `Score: ${Math.floor(st.score).toString().padStart(4, '0')}  `
      + `High: ${Math.floor(Math.max(st.highScore, st.score)).toString().padStart(4, '0')}  `
      + `Speed: ${st.speed.toFixed(0)}px/s  `
      + (st.nightTarget ? 'Night' : 'Day');
    ctx.fillText(hud, 12, 10);

    if (showGhost) {
      ctx.fillText(`Ghost: ${Math.floor(ghostRef.current.score).toString().padStart(4, '0')}`, 12, 28);
    }

    if (st.gameOver) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px ui-monospace, monospace';
      ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

      ctx.font = '20px ui-monospace, monospace';
      ctx.fillText(`Score: ${Math.floor(st.score)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
      ctx.fillText(`High Score: ${Math.floor(st.highScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);

      ctx.font = '16px ui-monospace, monospace';
      const restartText = isMobile ? 'Tap to restart' : 'Press Space or R to restart';
      ctx.fillText(restartText, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);

      ctx.textAlign = 'left';
    } else if (!st.running) {
      ctx.fillStyle = st.themeT < 0.5 ? '#475569' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.font = '16px ui-monospace, monospace';
      const controlText = isMobile
        ? 'Tap or swipe up to jump - Swipe down to duck'
        : 'Press Jump to Restart';
      ctx.fillText(controlText, GAME_WIDTH / 2, 40);
      ctx.textAlign = 'left';
    }
  }

  // Pointer (mobile) controls unchanged
  function handlePointerDown(e: React.PointerEvent) {
    if (disableUserControl) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    touchStartRef.current = { x, y, time: Date.now() };
    if (!stateRef.current.running) {
      restart();
      return;
    }
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (disableUserControl) return;
    if (!touchStartRef.current || !stateRef.current.running) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const deltaY = y - touchStartRef.current.y;
    if (deltaY > SWIPE_THRESHOLD) {
      stateRef.current.ducking = true;
    }
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (disableUserControl) return;
    if (!touchStartRef.current || !stateRef.current.running) {
      touchStartRef.current = null;
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const deltaX = x - touchStartRef.current.x;
    const deltaY = y - touchStartRef.current.y;
    const timeDelta = Date.now() - touchStartRef.current.time;

    stateRef.current.ducking = false;

    const isTap = timeDelta < TAP_TIME_THRESHOLD && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10;
    const isSwipeUp = deltaY < -SWIPE_THRESHOLD;

    if (isTap || isSwipeUp) {
      const st = stateRef.current;
      const dinoHeight = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      const onGround = st.dinoY >= FLOOR_Y - dinoHeight - 0.5;
      if (onGround) st.dinoVy = JUMP_VELOCITY;
    }
    touchStartRef.current = null;
  }

  const initializeCanvasRef = useRef<() => void>(() => {});
  initializeCanvasRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    genStars();
    render(ctx!);
  };

  useEffect(() => {
    initializeCanvasRef.current();
  }, []);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6 text-white">
      <header className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h1 className="text-lg font-semibold">Chrome Dino</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span>Seed</span>
            <input
              type="number"
              className="w-36 rounded-md bg-white/5 px-2 py-1 text-white outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={state.seed}
              onChange={e => {
                const ns = Math.abs(parseInt(e.target.value || '0', 10)) >>> 0;
                setState(s => ({ ...s, seed: ns }));
              }}
            />
          </label>
          <button
            onClick={() => restart()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
          >
            Restart
          </button>
          <button
            onClick={() => (stateRef.current.running ? togglePause() : restart())}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            disabled={state.gameOver}
          >
            {state.running ? 'Pause' : 'Start'}
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="relative mx-auto w-full max-w-[820px]">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              stateRef.current.ducking = false;
              touchStartRef.current = null;
            }}
            style={{
              width: GAME_WIDTH,
              height: GAME_HEIGHT,
              display: 'block',
              margin: '0 auto',
              touchAction: 'none',
              cursor: isMobile ? 'pointer' : 'default',
            }}
          />
        </div>
        <div className="mt-3 text-center text-xs text-zinc-400">
          {isMobile
            ? 'Tap or swipe up: jump - Swipe down: duck'
            : 'Space/W: jump - S: duck - P: pause - R: restart'}
        </div>
      </div>
    </div>
  );
}
