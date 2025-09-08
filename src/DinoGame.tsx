import React, { useEffect, useRef, useState } from 'react';

// --- Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 240;
const FLOOR_Y = GAME_HEIGHT - 40; // ground baseline

const DINO_WIDTH = 30;
const DINO_HEIGHT = 36;
const DINO_DUCK_HEIGHT = 22;
const DINO_X = 50; // left side placement

const GRAVITY = 2000; // px/s^2
const JUMP_VELOCITY = -620; // px/s (negative = up)

const BASE_SPEED = 260; // px/s
const SPEED_ACCEL = 12; // px/s^2
const MAX_SPEED = 425; // cap requested

// Cactus spawning tuned like the real game
const SPAWN_MIN_GAP = 240; // min distance between clusters
const SPAWN_VAR_GAP = 160; // added random distance

// Pterodactyl (bird) spawning
const BIRD_MIN_SPEED = 340; // start spawning once game is fast enough
const BIRD_MIN_SCORE = 20; // and the player has some score
const BIRD_MIN_GAP = 260; // distance between birds
const BIRD_VAR_GAP = 220;
const BIRD_WIDTH = 44;
const BIRD_HEIGHT = 24;

// Safety gap logic to avoid impossible combos
const SAFE_BASE_GAP = 120; // pixels at base speed
const SAFE_GAP_SPEED_SCALE = 1; // extra pixels per (px/s) beyond BASE_SPEED
const EXTRA_LOW_BIRD_AFTER_TALL_CACTUS = 40; // additional safety for nasty combo
const EXTRA_CACTUS_AFTER_LOW_BIRD = 24; // a bit of landing time after a low bird
const TALL_CACTUS_H = 42; // threshold to consider cactus tall

// Day/Night cycle
const THEME_SWITCH_POINTS = 25; // toggle every ~500 points
const THEME_FADE_SPEED = 0.9; // units per second for fade 0..1

// --- Types
interface BaseObstacle {
  id: number;
  x: number; // left X
  width: number;
  height: number;
  yTop: number; // top Y of the bounding box
  passed: boolean;
}

type Obstacle =
  | (BaseObstacle & { kind: 'cactus' })
  | (BaseObstacle & { kind: 'bird'; altitudeIdx: 0 | 1 | 2 });

interface GameState {
  dinoY: number; // top Y
  dinoVy: number;
  ducking: boolean;
  speed: number; // px/s
  score: number;
  highScore: number;
  obstacles: Obstacle[];
  running: boolean;
  seed: number;
  // theme
  nightTarget: boolean; // desired theme (true=night)
  themeT: number; // 0..1 current blend to night
  nextThemeScore: number; // score at which we toggle next
}

// Linear Congruential Generator for deterministic randomness
function createLCG(seed: number) {
  let s = seed >>> 0;
  return function rand(): number {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function aabbOverlap(a: { l: number; r: number; t: number; b: number }, b: { l: number; r: number; t: number; b: number }) {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function lerpColorHex(a: string, b: string, t: number) {
  const ai = parseInt(a.slice(1), 16);
  const bi = parseInt(b.slice(1), 16);
  const ar = (ai >> 16) & 255, ag = (ai >> 8) & 255, ab = ai & 255;
  const br = (bi >> 16) & 255, bg = (bi >> 8) & 255, bb = bi & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${(r << 16 | g << 8 | bl).toString(16).padStart(6, '0')}`;
}

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const spawnGapLeftRef = useRef<number>(SPAWN_MIN_GAP); // distance until next cactus cluster
  const birdGapLeftRef = useRef<number>(BIRD_MIN_GAP); // distance until next bird
  const nextIdRef = useRef<number>(1);
  const randRef = useRef<( ) => number>(() => Math.random());

  const [state, setState] = useState<GameState>({
    dinoY: FLOOR_Y - DINO_HEIGHT,
    dinoVy: 0,
    ducking: false,
    speed: BASE_SPEED,
    score: 0,
    highScore: 0,
    obstacles: [],
    running: false,
    seed: Math.floor(Math.random() * 1e9) >>> 0,
    nightTarget: false,
    themeT: 0,
    nextThemeScore: THEME_SWITCH_POINTS,
  });

  // Keep a mutable mirror to avoid setState every frame
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Initialize RNG whenever seed changes
  useEffect(() => {
    randRef.current = createLCG(state.seed);
    genStars();
  }, [state.seed]);

  // Input handlers
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        const st = stateRef.current;
        const onGround = st.dinoY >= FLOOR_Y - (st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT) - 0.5;
        if (onGround) st.dinoVy = JUMP_VELOCITY;
        if (!st.running) start();
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        stateRef.current.ducking = true;
      } else if (e.key === 'p') {
        togglePause();
      } else if (e.key === 'r') {
        restart();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 's') {
        stateRef.current.ducking = false;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  function start() {
    if (stateRef.current.running) return;
    setState(s => ({ ...s, running: true }));
    lastTsRef.current = null;
    spawnGapLeftRef.current = SPAWN_MIN_GAP;
    birdGapLeftRef.current = BIRD_MIN_GAP;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  function togglePause() {
    const st = stateRef.current;
    if (st.running) {
      // pause
      setState(s => ({ ...s, running: false }));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    } else {
      start();
    }
  }

  function restart() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const highScore = Math.max(stateRef.current.highScore, stateRef.current.score);
    const seed = stateRef.current.seed; // keep same seed unless user changes
    const fresh: GameState = {
      dinoY: FLOOR_Y - DINO_HEIGHT,
      dinoVy: 0,
      ducking: false,
      speed: BASE_SPEED,
      score: 0,
      highScore,
      obstacles: [],
      running: false,
      seed,
      nightTarget: false,
      themeT: 0,
      nextThemeScore: THEME_SWITCH_POINTS,
    };
    stateRef.current = fresh;
    setState(fresh);
    lastTsRef.current = null;
    spawnGapLeftRef.current = SPAWN_MIN_GAP;
    birdGapLeftRef.current = BIRD_MIN_GAP;
    randRef.current = createLCG(seed);
    genStars();
  }

  // helpers for safety
  function getLastObstacle(): Obstacle | null {
    const arr = stateRef.current.obstacles;
    if (arr.length === 0) return null;
    let last = arr[0];
    for (const o of arr) if (o.x > last.x) last = o;
    return last;
  }

  function minSafeGap(speed: number, prev: Obstacle | null, nextKind: 'cactus' | 'bird', nextAltIdx?: 0 | 1 | 2) {
    let g = SAFE_BASE_GAP + Math.max(0, speed - BASE_SPEED) * SAFE_GAP_SPEED_SCALE;
    if (prev) {
      if (prev.kind === 'cactus' && nextKind === 'bird' && nextAltIdx === 0) {
        // low bird after tall cactus needs extra landing time
        const tall = prev.height >= TALL_CACTUS_H;
        g += tall ? EXTRA_LOW_BIRD_AFTER_TALL_CACTUS : Math.floor(EXTRA_LOW_BIRD_AFTER_TALL_CACTUS * 0.6);
      }
      if (prev.kind === 'bird' && nextKind === 'cactus') {
        // small cushion after a low bird
        const prevLow = prev.yTop >= FLOOR_Y - (BIRD_HEIGHT + 42) - 0.5; // close to ground
        if (prevLow) g += EXTRA_CACTUS_AFTER_LOW_BIRD;
      }
    }
    return g;
  }

  // Main loop
  function loop(ts: number) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // compute dt in seconds (clamp to avoid spiral of death)
    let dt = 0;
    if (lastTsRef.current !== null) {
      dt = (ts - lastTsRef.current) / 1000;
      if (dt > 0.05) dt = 0.05; // clamp at ~20 FPS worst case
    }
    lastTsRef.current = ts;

    // step simulation at fixed 60Hz chunks
    const step = 1 / 60;
    let acc = dt;
    while (acc > 0) {
      const h = Math.min(step, acc);
      simStep(h);
      acc -= h;
    }

    render(ctx);

    if (stateRef.current.running) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  function simStep(dt: number) {
    const st = stateRef.current;
    if (!st.running) return;

    // accelerate speed gradually with cap
    st.speed = Math.min(MAX_SPEED, st.speed + SPEED_ACCEL * dt);

    // Dino physics
    const dinoHeight = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    st.dinoVy += GRAVITY * dt;
    st.dinoY += st.dinoVy * dt;
    // ground collision
    const groundTop = FLOOR_Y - dinoHeight;
    if (st.dinoY > groundTop) {
      st.dinoY = groundTop;
      st.dinoVy = 0;
    }

    // Obstacles update
    const dx = -st.speed * dt; // move leftwards toward dino
    let passedThisFrame = 0;

    st.obstacles.forEach(o => {
      o.x += dx;
      const oRight = o.x + o.width;
      // mark "passed" when obstacle is entirely left of the dino
      if (!o.passed && oRight < DINO_X - 2) {
        o.passed = true;
        passedThisFrame += 1;
      }
    });

    // remove off-screen obstacles
    st.obstacles = st.obstacles.filter(o => o.x + o.width > -20);

    // Spawn logic based on distance traveled since last spawn
    spawnGapLeftRef.current += dx; // dx is negative, so this decreases
    if (spawnGapLeftRef.current <= 0) {
      spawnCactusCluster();
      // reset next cactus gap deterministically
      const r = randRef.current();
      const nextGap = SPAWN_MIN_GAP + Math.floor(r * SPAWN_VAR_GAP);
      spawnGapLeftRef.current = nextGap;
    }

    // Bird spawn: gated by speed and score, independent gap
    birdGapLeftRef.current += dx;
    if (st.speed >= BIRD_MIN_SPEED && st.score >= BIRD_MIN_SCORE && birdGapLeftRef.current <= 0) {
      spawnBird();
      const r = randRef.current();
      const nextGap = BIRD_MIN_GAP + Math.floor(r * BIRD_VAR_GAP);
      birdGapLeftRef.current = nextGap;
    }

    // Collision detection
    const dinoRect = {
      l: DINO_X,
      r: DINO_X + DINO_WIDTH,
      t: st.dinoY,
      b: st.dinoY + dinoHeight,
    };

    let collided = false;
    for (const o of st.obstacles) {
      const oRect = {
        l: o.x,
        r: o.x + o.width,
        t: o.yTop,
        b: o.yTop + o.height,
      };
      if (aabbOverlap(dinoRect, oRect)) {
        collided = true;
        break;
      }
    }

    if (collided) {
      // game over
      st.running = false;
      setState(s => ({
        ...s,
        running: false,
        highScore: Math.max(s.highScore, s.score),
      }));
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // scoring: time survived + obstacles cleared
    if (passedThisFrame > 0) st.score += passedThisFrame;
    // small time reward (smooth score growth)
    st.score += dt * 0.5;

    // Theme switch based on score
    if (st.score >= st.nextThemeScore) {
      st.nightTarget = !st.nightTarget;
      st.nextThemeScore += THEME_SWITCH_POINTS;
    }
    const dir = st.nightTarget ? 1 : -1;
    st.themeT = clamp01(st.themeT + dir * THEME_FADE_SPEED * dt);

    // commit a throttled UI snapshot ~30fps
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

  // helper to throttle UI updates
  const snapTimer = useRef(0);
  function snapshotEvery(period: number, fn: () => void) {
    snapTimer.current += 1 / 60;
    if (snapTimer.current >= period) {
      snapTimer.current = 0;
      fn();
    }
  }

  // Spawn a cactus cluster (1..3) with small/large variants and slim graphics
  function spawnCactusCluster() {
    const st = stateRef.current;
    const r = randRef.current();

    // Choose cactus size family (small vs large)
    const large = r < 0.45; // ~45% large clusters
    const baseH = large ? 46 : 32;
    const baseW = large ? 12 : 10; // slim cacti like the real game

    // Choose cluster size 1..3 (weights ~ 55%, 30%, 15%)
    const r2 = randRef.current();
    const clusterSize = r2 < 0.55 ? 1 : r2 < 0.85 ? 2 : 3;

    // spacing between cacti inside the cluster
    const gapMin = 12, gapVar = 10;

    // ensure safe distance from previous obstacle
    const last = getLastObstacle();
    const required = minSafeGap(st.speed, last, 'cactus');
    let x = Math.max(GAME_WIDTH + 20, last ? last.x + last.width + required : GAME_WIDTH + 20);

    for (let i = 0; i < clusterSize; i++) {
      const wJitter = Math.floor(randRef.current() * 3); // 0..2 width variance
      const hJitter = Math.floor(randRef.current() * 3); // tiny height variance
      const width = baseW + wJitter;
      const height = baseH + hJitter;
      const yTop = FLOOR_Y - height;
      stateRef.current.obstacles.push({ id: nextIdRef.current++, x, width, height, yTop, passed: false, kind: 'cactus' });

      // position next cactus in the cluster with a small gap
      const innerGap = gapMin + Math.floor(randRef.current() * gapVar);
      x += width + innerGap;
    }

    // After placing a cluster, widen the next spawn distance slightly by cluster footprint
    const footprint = (baseW + 14) * clusterSize; // rough total width incl. gaps
    spawnGapLeftRef.current += footprint * 0.6; // push next spawn a bit further
  }

  // Spawn a bird (pterodactyl) at one of three altitudes
  function spawnBird() {
    const st = stateRef.current;
    const rnd = randRef.current;

    // Altitudes relative to ground (top of bounding box)
    const altitudes = [
      FLOOR_Y - (BIRD_HEIGHT + 42), // low (forces duck at higher speeds)
      FLOOR_Y - (BIRD_HEIGHT + 72), // mid
      FLOOR_Y - (BIRD_HEIGHT + 102), // high
    ];
    const altitudeIdx = Math.floor(rnd() * altitudes.length) as 0 | 1 | 2;
    const yTop = altitudes[altitudeIdx];

    // slight width jitter for variety
    const width = BIRD_WIDTH + Math.floor(rnd() * 3) - 1; // +-1 px
    const height = BIRD_HEIGHT;

    // ensure safe distance from previous obstacle
    const last = getLastObstacle();
    const required = minSafeGap(st.speed, last, 'bird', altitudeIdx);
    let x = Math.max(GAME_WIDTH + 20, last ? last.x + last.width + required : GAME_WIDTH + 20);

    stateRef.current.obstacles.push({ id: nextIdRef.current++, x, width, height, yTop, passed: false, kind: 'bird', altitudeIdx });
  }

  // --- Night sky stars (deterministic by seed)
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

    // background blend
    const daySky = '#f8fafc';
    const nightSky = '#0b0e1a';
    const sky = lerpColorHex(daySky, nightSky, st.themeT);

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // sky
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // stars (fade in with night)
    if (st.themeT > 0) {
      const alpha = st.themeT; // simple fade
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e2e8f0';
      for (const s of starsRef.current) {
        // simple twinkle using time
        const tw = 0.5 + 0.5 * Math.sin((performance.now() / 800) + s.tw);
        ctx.globalAlpha = alpha * (0.6 + 0.4 * tw);
        ctx.fillRect(s.x, s.y, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // ground line (darker at night)
    const groundDay = '#94a3b8';
    const groundNight = '#334155';
    ctx.fillStyle = lerpColorHex(groundDay, groundNight, st.themeT);
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 2);

    // obstacles
    const obsDay = '#0f172a';
    const obsNight = '#eab308'; // slight warm tint at night for visibility
    const obsColor = lerpColorHex(obsDay, obsNight, st.themeT * 0.5);

    for (const o of st.obstacles) {
      if (o.kind === 'cactus') {
        ctx.fillStyle = obsColor;
        ctx.fillRect(o.x, o.yTop, o.width, o.height);
      } else {
        // bird body + wings (wing flaps over time)
        ctx.fillStyle = obsColor;
        // body
        ctx.fillRect(o.x, o.yTop + 6, o.width, o.height - 12);
        // head
        ctx.fillRect(o.x + o.width - 10, o.yTop + 4, 8, 8);

        // wings: alternate up/down using time and id for variety
        const flap = Math.sin(performance.now() / 120 + o.id) > 0 ? 'up' : 'down';
        if (flap === 'up') {
          ctx.fillRect(o.x + 6, o.yTop + 0, o.width - 20, 6);
        } else {
          ctx.fillRect(o.x + 6, o.yTop + o.height - 6, o.width - 20, 6);
        }
      }
    }

    // dino
    const dinoHeight = st.ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(DINO_X, st.dinoY, DINO_WIDTH, dinoHeight);
    // eye
    ctx.fillStyle = st.themeT < 0.5 ? '#0f172a' : '#cbd5e1';
    ctx.fillRect(DINO_X + 10, st.dinoY + 8, 4, 4);

    // HUD
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = st.themeT < 0.5 ? '#0f172a' : '#cbd5e1';
    const s = `Score: ${Math.floor(st.score).toString().padStart(4, '0')}  ` +
              `High: ${Math.floor(Math.max(st.highScore, st.score)).toString().padStart(4, '0')}  ` +
              `Speed: ${st.speed.toFixed(0)}px/s  ` +
              (st.nightTarget ? 'Night' : 'Day');
    ctx.fillText(s, 12, 10);

    if (!st.running) {
      ctx.fillStyle = st.themeT < 0.5 ? '#475569' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.font = '16px ui-monospace, monospace';
      ctx.fillText('Press Space to jump · R to restart · P to pause', GAME_WIDTH / 2, 40);
      ctx.textAlign = 'left';
    }
  }

  // Canvas setup & resize to pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    genStars();
    render(ctx!);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // UI controls (seed + buttons)
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
                const seed = Math.abs(parseInt(e.target.value || '0', 10)) >>> 0;
                setState(s => ({ ...s, seed }));
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
            onClick={() => (stateRef.current.running ? togglePause() : start())}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
          >
            {state.running ? 'Pause' : 'Start'}
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="relative mx-auto w-full max-w-[820px]">
          <canvas
            ref={canvasRef}
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT, display: 'block', margin: '0 auto' }}
          />
        </div>
        <div className="mt-3 text-center text-xs text-zinc-400">
          Controls: Space/W/↑ jump · S/↓ duck · P pause · R restart 
        </div>
      </div>
    </div>
  );
}
