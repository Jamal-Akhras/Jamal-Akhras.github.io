import { Link } from "react-router-dom";

export default function Projects() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10/50 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-indigo-400">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-zinc-300">
            <Link to="/" className="rounded-xl px-3 py-2 hover:bg-white/5">Home</Link>
            <span className="rounded-xl px-3 py-2 bg-white/5">Projects</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Projects</h1>
          <p className="mt-3 text-zinc-300">Pick a project to try (demos coming soon).</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: AI Racer */}
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">AI Racer</h3>
            <p className="mt-1 text-sm text-zinc-300">Design a Course and Watch a Car Learn The Optimal Path</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-xl border border-white/10 px-4 py-2 text-zinc-400" disabled>
                Play (coming soon)
              </button>
            </div>
          </article>

          {/* Card: Chrome Dino / Steve */}
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">Chrome Dino (Steve)</h3>
            <p className="mt-1 text-sm text-zinc-300">The Classic Game I've Probably Played Too Much</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-xl border border-white/10 px-4 py-2 text-zinc-400" disabled>
                Play (coming soon)
              </button>
            </div>
          </article>

          {/* Add more cards later */}
        </div>

        <div className="mt-10 text-center">
          <Link to="/" className="inline-block rounded-2xl border border-white/10 px-5 py-3 hover:bg-white/5">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
