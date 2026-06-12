// src/ai-racer/AIRacerPage.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DecorativeBg from '../components/DecorativeBg';
import TrackEditor from './track-editor/TrackEditor';
import RacingGame from './RacingGame';
import { FitnessChart, type FitnessPoint } from './FitnessChart';
import { NetworkView, type NetworkSnapshot } from './NetworkView';
import type { Track, GameMode, AIConfig, RewardWeights } from './core/types';
import { GAME_CONSTANTS, DEFAULT_AI_CONFIG } from './core/types';

// Keys of AIConfig whose value is a plain number (so sliders can bind to them).
type NumericConfigKey = { [K in keyof AIConfig]: AIConfig[K] extends number ? K : never }[keyof AIConfig];

export default function AIRacerPage() {
  const [mode, setMode] = useState<GameMode>('draw');
  const [track, setTrack] = useState<Track | null>(null);
  const [populationSize, setPopulationSize] = useState(20);

  // "The Nerdy Stuff" — AI/training configuration.
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [showNerdy, setShowNerdy] = useState(false);
  const [restartKey, setRestartKey] = useState(0); // bump to remount the sim (apply structural params)
  const setCfg = <K extends keyof AIConfig>(key: K, value: AIConfig[K]) =>
    setAiConfig((c) => ({ ...c, [key]: value }));
  const setReward = <K extends keyof RewardWeights>(key: K, value: number) =>
    setAiConfig((c) => ({ ...c, reward: { ...c.reward, [key]: value } }));

  const [networkSnapshot, setNetworkSnapshot] = useState<NetworkSnapshot | null>(null);
  const handleNetwork = useCallback((snap: NetworkSnapshot | null) => setNetworkSnapshot(snap), []);

  // Best/avg fitness per generation for the training chart.
  const [fitnessHistory, setFitnessHistory] = useState<FitnessPoint[]>([]);
  // Stable so RacingGame's loop isn't torn down each time a generation completes.
  const handleGeneration = useCallback((stats: FitnessPoint) => {
    // generation 1 means a fresh run (new network) -> start the series over.
    setFitnessHistory((h) => (stats.generation <= 1 ? [stats] : [...h, stats]));
  }, []);

  const handleTrackComplete = (newTrack: Track) => {
    setTrack(newTrack);
  };

  // Fullscreen: the stage wrapper goes fullscreen and the fixed-size game box is
  // CSS-scaled to fit (preserving aspect ratio, letterboxed).
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setScale(1);
      return;
    }
    const update = () =>
      setScale(Math.min(
        window.innerWidth / GAME_CONSTANTS.CANVAS_WIDTH,
        window.innerHeight / GAME_CONSTANTS.CANVAS_HEIGHT,
      ));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      stageRef.current?.requestFullscreen();
    }
  };

  const btn = (active: boolean, disabled = false) =>
    `inline-flex items-center rounded-2xl px-4 py-2 whitespace-nowrap ring-1 ring-white/10 transition
     ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
     ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`;

  // Reusable controls so they can appear both in the page layout and as a
  // fullscreen overlay.
  const modeSwitcher = (
    <>
      <button className={btn(mode === 'draw')} onClick={() => setMode('draw')} aria-pressed={mode === 'draw'}>
        Draw Track
      </button>
      <button
        className={btn(mode === 'watch-ai-learn', !track)}
        onClick={() => track && setMode('watch-ai-learn')}
        disabled={!track}
        aria-pressed={mode === 'watch-ai-learn'}
      >
        Watch AI Learn
      </button>
      <button
        className={btn(mode === 'time-trial', !track)}
        onClick={() => track && setMode('time-trial')}
        disabled={!track}
        aria-pressed={mode === 'time-trial'}
      >
        Time Trial
      </button>
      <button
        className={btn(mode === 'live-race', !track)}
        onClick={() => track && setMode('live-race')}
        disabled={!track}
        aria-pressed={mode === 'live-race'}
      >
        Live Race
      </button>
    </>
  );

  const showPopulation = mode === 'draw' || mode === 'watch-ai-learn';
  const populationControl = (
    <div className="flex items-center gap-4">
      <label className="text-sm text-zinc-300">
        AI Population: <span className="font-mono text-white">{populationSize}</span>
      </label>
      <input
        type="range"
        min={5}
        max={100}
        value={populationSize}
        onChange={(e) => setPopulationSize(Number(e.target.value))}
        className="w-40"
      />
      <span className="hidden text-xs text-zinc-500 sm:inline">
        (fewer = faster, more = better learning)
      </span>
    </div>
  );

  // A labelled slider for one numeric AIConfig field.
  const sliderRow = (label: string, value: number, min: number, max: number, step: number, suffix: string, onChange: (v: number) => void) => (
    <label className="flex flex-col gap-1 text-xs text-zinc-300">
      <span>
        {label}: <span className="font-mono text-white">{Number.isInteger(value) ? value : value.toFixed(2)}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-400"
      />
    </label>
  );

  const cfgSlider = (label: string, key: NumericConfigKey, min: number, max: number, step: number, suffix = '') =>
    sliderRow(label, aiConfig[key] as number, min, max, step, suffix, (v) => setCfg(key, v));

  const rewardSlider = (label: string, key: keyof RewardWeights, min: number, max: number, step: number) =>
    sliderRow(label, aiConfig.reward[key], min, max, step, '', (v) => setReward(key, v));

  const nerdyPanel = (
    <div className="mt-3 w-full max-w-2xl rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
        {cfgSlider('Sim speed', 'simSpeed', 1, 10, 1, '×')}
        {cfgSlider('Generation length', 'maxGenerationTime', 5, 60, 1, 's')}
        {cfgSlider('Stall timeout', 'checkpointTimeout', 1, 10, 0.5, 's')}
        {cfgSlider('Hidden layers', 'hiddenLayers', 1, 4, 1)}
        {cfgSlider('Hidden neurons', 'hiddenSize', 2, 24, 1)}
        {cfgSlider('Mutation rate', 'mutationRate', 0, 1, 0.05)}
        {cfgSlider('Elitism', 'elitism', 0, 0.5, 0.05)}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 text-xs font-semibold text-zinc-300">Reward function</div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          {rewardSlider('Progress (accuracy)', 'progress', 0, 300, 10)}
          {rewardSlider('Speed', 'speed', 0, 200, 10)}
          {rewardSlider('Smoothness', 'smoothness', 0, 100, 5)}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
        <button
          className="rounded-xl bg-indigo-500/80 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
          onClick={() => setRestartKey((k) => k + 1)}
        >
          Restart training
        </button>
        <span className="text-xs text-zinc-500">
          Sim speed, generation length, stall timeout and the reward weights apply live;
          hidden layers/neurons, mutation and elitism take effect on restart.
        </span>
      </div>
    </div>
  );

  const nerdyControls = (
    <div className="flex flex-col items-start">
      <button className={btn(showNerdy)} onClick={() => setShowNerdy((s) => !s)} aria-expanded={showNerdy}>
        The Nerdy Stuff {showNerdy ? '▲' : '▼'}
      </button>
      {showNerdy && nerdyPanel}
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <DecorativeBg />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10/50 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-white">
            J<span className="text-indigo-400">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-zinc-300">
            <Link to="/" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Home
            </Link>
            <Link to="/projects" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Projects
            </Link>
            <span className="rounded-xl px-3 py-2 bg-white/5">AI Racer</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl p-6 text-white">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI Racer</h1>
          <p className="mt-1 text-zinc-400">
            Draw a track and watch AI learn the optimal racing line
          </p>
        </div>

        {/* Mode switcher */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {modeSwitcher}
          <button className={`${btn(false)} ml-auto`} onClick={toggleFullscreen}>
            Fullscreen
          </button>
        </div>

        {/* Population size control */}
        {showPopulation && <div className="mb-4">{populationControl}</div>}

        {/* The Nerdy Stuff */}
        <div className="mb-4">{nerdyControls}</div>

        {/* Mode content */}
        <div
          ref={stageRef}
          className={isFullscreen ? 'fixed inset-0 z-[60] flex items-center justify-center bg-black' : ''}
        >
        <div
          className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
          style={{
            width: GAME_CONSTANTS.CANVAS_WIDTH,
            height: GAME_CONSTANTS.CANVAS_HEIGHT,
            transform: isFullscreen ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          {mode === 'draw' && (
            <TrackEditor
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              onTrackComplete={handleTrackComplete}
            />
          )}

          {mode === 'watch-ai-learn' && track && (
            <RacingGame
              key={`watch-ai-learn-${populationSize}-${restartKey}`}
              track={track}
              mode={mode}
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              populationSize={populationSize}
              aiConfig={aiConfig}
              onGenerationComplete={handleGeneration}
              onNetwork={handleNetwork}
            />
          )}

          {mode === 'time-trial' && track && (
            <RacingGame
              key="time-trial"
              track={track}
              mode={mode}
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              populationSize={1}
            />
          )}

          {mode === 'live-race' && track && (
            <RacingGame
              key="live-race"
              track={track}
              mode={mode}
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              populationSize={2}
            />
          )}
        </div>
        {isFullscreen && (
          <div className="absolute left-1/2 top-4 z-[61] flex max-w-[95vw] -translate-x-1/2 flex-col items-center gap-2 rounded-2xl bg-black/70 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {modeSwitcher}
              <button className={btn(false)} onClick={toggleFullscreen}>
                Exit Fullscreen
              </button>
            </div>
            {showPopulation && populationControl}
            {nerdyControls}
            {mode === 'watch-ai-learn' && (
              <div className="w-[640px] max-w-[95vw]">
                <FitnessChart data={fitnessHistory} />
              </div>
            )}
          </div>
        )}
        </div>

        {/* Training panels */}
        {mode === 'watch-ai-learn' && !isFullscreen && (
          <div className="mt-4 grid w-full max-w-4xl grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-200">Training progress</h3>
              <FitnessChart data={fitnessHistory} />
              <p className="mt-2 text-xs text-zinc-500">
                The line on the track is the best driver's path from the previous generation,
                coloured by speed (red = slow, green = fast).
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-200">Leader's neural network</h3>
              <NetworkView snapshot={networkSnapshot} />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-sm text-zinc-400">
          {mode === 'draw' && (
            <p>
              Click and drag to draw a track. Bring the line back to the start to close the loop.
              The track width can be adjusted with the slider.
            </p>
          )}
          {mode === 'watch-ai-learn' && (
            <p>Watch 50 AI cars learn to race around your track using NEAT evolution.</p>
          )}
          {mode === 'time-trial' && (
            <p>Race against the AI's best time. Use arrow keys or WASD to control your car.</p>
          )}
          {mode === 'live-race' && (
            <p>Race head-to-head against the trained AI.</p>
          )}
        </div>
      </main>
    </div>
  );
}
