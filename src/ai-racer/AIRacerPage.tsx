// src/ai-racer/AIRacerPage.tsx
import { useState } from 'react';
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
    console.log('Track created:', newTrack);
  };

  const btn = (active: boolean, disabled = false) =>
    `inline-flex items-center rounded-2xl px-4 py-2 whitespace-nowrap ring-1 ring-white/10 transition
     ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
     ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`;

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
          <button
            className={btn(mode === 'draw')}
            onClick={() => setMode('draw')}
            aria-pressed={mode === 'draw'}
          >
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
        </div>

        {/* Population size control */}
        {mode === 'draw' && (
          <div className="mb-4 flex items-center gap-4">
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
            <span className="text-xs text-zinc-500">
              (fewer = faster, more = better learning)
            </span>
          </div>
        )}

        {/* Mode content */}
        <div
          className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
          style={{ width: GAME_CONSTANTS.CANVAS_WIDTH, height: GAME_CONSTANTS.CANVAS_HEIGHT }}
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
              key={`time-trial-${Date.now()}`}
              track={track}
              mode={mode}
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              populationSize={1}
            />
          )}

          {mode === 'live-race' && track && (
            <RacingGame
              key={`live-race-${Date.now()}`}
              track={track}
              mode={mode}
              width={GAME_CONSTANTS.CANVAS_WIDTH}
              height={GAME_CONSTANTS.CANVAS_HEIGHT}
              populationSize={2}
            />
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
