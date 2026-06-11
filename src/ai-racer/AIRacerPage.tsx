// src/ai-racer/AIRacerPage.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DecorativeBg from '../components/DecorativeBg';
import TrackEditor from './track-editor/TrackEditor';
import RacingGame from './RacingGame';
import type { Track, GameMode } from './core/types';
import { GAME_CONSTANTS } from './core/types';

export default function AIRacerPage() {
  const [mode, setMode] = useState<GameMode>('draw');
  const [track, setTrack] = useState<Track | null>(null);
  const [populationSize, setPopulationSize] = useState(20);

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
              key={`watch-ai-learn-${populationSize}`}
              track={track}
              mode={mode}
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              populationSize={populationSize}
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
          </div>
        )}
        </div>

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
