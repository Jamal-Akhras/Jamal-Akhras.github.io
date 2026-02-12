// src/dino-game/DinoModesPage.tsx
import DecorativeBg from "../components/DecorativeBg";
import { useState } from "react";
import { Link } from "react-router-dom";
import DinoGame from "./DinoGame";
import { endlessController } from "./ai/aiControllers";

type Mode = "free" | "challenge" | "endless";

export default function DinoModesPage() {
  const [mode, setMode] = useState<Mode>("free");

  // Controllers per mode
  const controller = mode === "endless" ? endlessController : undefined;       // AI drives main dino in Endless
  const ghostController = mode === "challenge" ? endlessController : undefined; // AI ghost matches Endless in Challenge
  const autoStart = mode === "endless"; // Endless autostarts

  const btn = (active: boolean) =>
    `inline-flex items-center rounded-2xl px-4 py-2 whitespace-nowrap ring-1 ring-white/10
     ${active ? "bg-white/10 text-white" : "bg-white/5 text-zinc-200 hover:bg-white/10"}`;

  return (
    <div className="relative min-h-screen">
      <DecorativeBg />

      {/* Site header (always topmost) */}
      <header className="sticky top-0 z-50 border-b border-white/10/50 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-indigo-400">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-zinc-300">
            <Link to="/" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Home
            </Link>
            <span className="rounded-xl px-3 py-2 bg-white/5">Projects</span>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-5xl p-6 text-white">
        {/* Mode switcher — one row */}
        <div className="mb-6 flex flex-nowrap items-center gap-3">
          <button
            className={btn(mode === "free")}
            onClick={() => setMode("free")}
            aria-pressed={mode === "free"}
          >
            Free Play
          </button>

          <button
            className={btn(mode === "challenge")}
            onClick={() => setMode("challenge")}
            aria-pressed={mode === "challenge"}
          >
            AI Challenge (Ghost)
          </button>

          <button
            className={btn(mode === "endless")}
            onClick={() => setMode("endless")}
            aria-pressed={mode === "endless"}
          >
            AI Endless
          </button>
        </div>

        {/* Game */}
        <DinoGame
          key={mode}
          controller={controller}
          ghostController={ghostController}
          showGhost={mode === "challenge"}
          ghostLeadPx={mode === "challenge" ? 0 : 16}
          ghostRenderOffsetPx={mode === "challenge" ? -16 : 0}
          autoStart={autoStart}
          playerColor={mode === "endless" ? "#ef4444" : undefined}
          disableUserControl={mode === "endless"}
          // seed={12345} // (optional) force deterministic runs across modes
          onEpisodeEnd={(score, seed) => {
            console.log(`[${mode}] score=${score} seed=${seed}`);
          }}
        />
      </main>
    </div>
  );
}
