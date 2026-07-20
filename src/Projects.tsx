import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DecorativeBg from "./components/DecorativeBg";
import { SunIcon, MoonIcon } from "./components/icons";
import { useTheme } from "./hooks/useTheme";
import { fadeUp } from "./constants/animations";
import { DEMOS, type Demo } from "./constants/projects";

const accentClasses = {
  indigo: {
    border: "border-indigo-400/25",
    text: "text-indigo-300",
    glow: "bg-indigo-400/10",
  },
  emerald: {
    border: "border-emerald-400/25",
    text: "text-emerald-300",
    glow: "bg-emerald-400/10",
  },
  pink: {
    border: "border-pink-400/25",
    text: "text-pink-300",
    glow: "bg-pink-400/10",
  },
};

function ProjectPreview({ kind }: { kind: Demo["kind"] }) {
  if (kind === "racer") {
    return (
      <svg viewBox="0 0 360 180" className="h-full w-full" role="img" aria-label="AI Racer preview">
        <rect width="360" height="180" rx="18" fill="rgba(0,0,0,0.22)" />
        <path
          d="M58 112 C66 38 161 35 205 64 C264 104 304 68 316 110 C332 164 216 160 178 128 C136 93 99 158 58 112Z"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M58 112 C66 38 161 35 205 64 C264 104 304 68 316 110 C332 164 216 160 178 128 C136 93 99 158 58 112Z"
          fill="none"
          stroke="#818cf8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="205" cy="64" r="5" fill="#f8fafc" />
      </svg>
    );
  }

  if (kind === "runner") {
    return (
      <svg viewBox="0 0 360 180" className="h-full w-full" role="img" aria-label="Chrome Dino preview">
        <rect width="360" height="180" rx="18" fill="rgba(0,0,0,0.22)" />
        <path d="M34 128 H326" stroke="rgba(255,255,255,0.24)" strokeWidth="2" strokeDasharray="8 9" />
        <g transform="translate(100 82)">
          <rect x="0" y="18" width="38" height="34" rx="7" fill="#d9f99d" />
          <rect x="25" y="2" width="31" height="29" rx="7" fill="#bef264" />
          <rect x="47" y="12" width="9" height="6" fill="#0b0c10" />
          <rect x="8" y="51" width="8" height="19" rx="4" fill="#84cc16" />
          <rect x="28" y="51" width="8" height="19" rx="4" fill="#84cc16" />
        </g>
        <rect x="248" y="100" width="12" height="28" rx="3" fill="#f472b6" />
        <rect x="274" y="82" width="12" height="46" rx="3" fill="#f472b6" opacity="0.72" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 180" className="h-full w-full" role="img" aria-label="Search visualizer preview">
      <rect width="360" height="180" rx="18" fill="rgba(0,0,0,0.22)" />
      {Array.from({ length: 9 }).map((_, r) =>
        Array.from({ length: 16 }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={26 + c * 19}
            y={22 + r * 15}
            width="16"
            height="12"
            rx="3"
            fill={(r === 4 && c > 4 && c < 11) || (c === 9 && r > 1 && r < 7) ? "rgba(8,47,73,0.85)" : "rgba(255,255,255,0.06)"}
            stroke="rgba(255,255,255,0.06)"
          />
        )),
      )}
      <path d="M48 90 C92 64 128 58 169 80 C213 104 247 91 310 58" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 90 C84 105 123 117 165 104 C212 89 249 74 310 58" fill="none" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <circle cx="48" cy="90" r="7" fill="#34d399" />
      <circle cx="310" cy="58" r="7" fill="#f472b6" />
    </svg>
  );
}

function ProjectCard({ demo }: { demo: Demo }) {
  const accent = accentClasses[demo.accent];

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`group overflow-hidden rounded-2xl border ${accent.border} bg-bg-elevated/70 shadow-[var(--shadow-card)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]`}
    >
      <div className={`h-44 border-b border-border-subtle ${accent.glow}`}>
        <ProjectPreview kind={demo.kind} />
      </div>

      <div className="p-5">
        <p className={`font-mono text-xs uppercase tracking-[0.22em] ${accent.text}`}>{demo.eyebrow}</p>
        <h2 className="mt-2 text-xl font-bold text-text-primary">{demo.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{demo.blurb}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {demo.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-border-subtle bg-bg-hover/60 px-2.5 py-1 text-xs text-text-secondary">
              {tag}
            </span>
          ))}
        </div>

        <Link
          to={demo.to}
          className="mt-5 inline-flex rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-accent-primary hover:text-accent-primary"
        >
          Open project
        </Link>
      </div>
    </motion.article>
  );
}

export default function Projects() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen text-text-primary">
      <DecorativeBg />

      <header className="sticky top-0 z-50 border-b border-border-subtle backdrop-blur supports-[backdrop-filter]:bg-bg-base/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-accent-primary">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-text-secondary">
            <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Home</Link>
            <Link to="/experience" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Experience</Link>
            <span className="rounded-xl bg-bg-elevated px-3 py-2">Projects</span>
            <button
              onClick={toggleTheme}
              className="ml-2 rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="py-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-muted">Playable demos</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Projects</h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-text-secondary">
            A small collection of interactive builds. Open one up, change the controls, and see what happens.
          </p>
        </motion.section>

        <section className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
          {DEMOS.map((demo) => (
            <ProjectCard key={demo.to} demo={demo} />
          ))}
        </section>

        <div className="mt-12 text-center">
          <Link to="/" className="btn-tertiary">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
