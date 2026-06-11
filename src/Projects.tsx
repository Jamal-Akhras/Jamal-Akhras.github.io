import { Link } from "react-router-dom";
import DecorativeBg from "./components/DecorativeBg";
import { useTheme } from "./hooks/useTheme";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

export default function Projects() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen text-text-primary">
      {/* Animated background */}
      <DecorativeBg />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-subtle backdrop-blur supports-[backdrop-filter]:bg-bg-base/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-accent-primary">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-text-secondary">
            <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Home</Link>
            <span className="rounded-xl px-3 py-2 bg-bg-elevated">Projects</span>
            <button
              onClick={toggleTheme}
              className="ml-2 rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Projects</h1>
          <p className="mt-3 text-text-secondary">Pick a project to try.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Chrome Dino / Steve */}
          <Link
            to="/dino-game"
            className="card card-interactive p-5 block group"
          >
            <h3 className="font-semibold">Chrome Dino (Steve)</h3>
            <p className="mt-1 text-sm text-text-secondary">The Classic Game I've Probably Played Too Much</p>
            <div className="mt-4">
              <span className="btn-tertiary text-sm px-4 py-2 group-hover:border-accent-primary group-hover:text-accent-primary transition-colors">
                Play now
              </span>
            </div>
          </Link>

          {/* Card: AI Racer */}
          <Link
            to="/ai-racer"
            className="card card-interactive p-5 block group"
          >
            <h3 className="font-semibold">AI Racer</h3>
            <p className="mt-1 text-sm text-text-secondary">Design a Course and Watch a Car Learn The Optimal Path</p>
            <div className="mt-4">
              <span className="btn-tertiary text-sm px-4 py-2 group-hover:border-accent-primary group-hover:text-accent-primary transition-colors">
                Play now
              </span>
            </div>
          </Link>

          {/* Add more cards later */}
        </div>

        <div className="mt-10 text-center">
          <Link to="/" className="btn-tertiary">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
