import { Link } from "react-router-dom";
import DecorativeBg from "./components/DecorativeBg";
import { SunIcon, MoonIcon } from "./components/icons";
import { useTheme } from "./hooks/useTheme";
import { DEMOS } from "./constants/projects";

export default function Projects() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen text-text-primary">
      <DecorativeBg />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-subtle backdrop-blur supports-[backdrop-filter]:bg-bg-base/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-accent-primary">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-text-secondary">
            <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Home</Link>
            <Link to="/cv" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">CV</Link>
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
          <p className="mt-3 text-text-secondary">Interactive things I've built — jump in and play.</p>
        </div>

        <section className="mx-auto mt-10 max-w-4xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DEMOS.map((d) => (
              <Link key={d.to} to={d.to} className="card card-interactive group block p-6">
                <h3 className="text-lg font-semibold text-text-primary">{d.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{d.blurb}</p>
                <div className="mt-4">
                  <span className="btn-tertiary px-4 py-2 text-sm transition-colors group-hover:border-accent-primary group-hover:text-accent-primary">
                    Play now
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link to="/" className="btn-tertiary">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
