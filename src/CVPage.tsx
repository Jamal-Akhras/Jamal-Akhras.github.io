import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll } from "framer-motion";
import DecorativeBg from "./components/DecorativeBg";
import { SunIcon, MoonIcon } from "./components/icons";
import { useTheme } from "./hooks/useTheme";
import { fadeUp } from "./constants/animations";
import {
  CV_INTERESTS,
  CV_SECTIONS,
  FOCUS_OPTIONS,
  PROFILE_SIGNALS,
  SKILL_GROUPS,
  type CVEntry,
  type CVFocus,
} from "./constants/cv";

type FocusFilter = "all" | CVFocus;

const accentClass = {
  indigo: "from-indigo-400/25 via-indigo-400/5 to-transparent border-indigo-400/30",
  emerald: "from-emerald-400/25 via-emerald-400/5 to-transparent border-emerald-400/30",
  pink: "from-pink-400/25 via-pink-400/5 to-transparent border-pink-400/30",
  amber: "from-amber-400/25 via-amber-400/5 to-transparent border-amber-400/30",
};

function Tag({
  label,
  highlightedTag,
  onHover,
}: {
  label: string;
  highlightedTag: string | null;
  onHover: (t: string | null) => void;
}) {
  const active = highlightedTag === label;
  return (
    <span
      tabIndex={0}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(label)}
      onBlur={() => onHover(null)}
      className={`cursor-default rounded-full px-2 py-0.5 text-[11px] outline-none ring-1 transition-colors ${
        active
          ? "bg-accent-primary/15 text-text-primary ring-accent-primary/60"
          : "bg-bg-hover text-text-secondary ring-border-subtle"
      }`}
    >
      {label}
    </span>
  );
}

function hasFocus(entry: CVEntry, activeFocus: FocusFilter) {
  return activeFocus === "all" || entry.focus.includes(activeFocus);
}

function matchClass(tags: string[] | undefined, highlightedTag: string | null) {
  return highlightedTag && tags?.includes(highlightedTag)
    ? "border-accent-primary/60 bg-accent-primary/[0.06]"
    : "";
}

function FocusTabs({
  activeFocus,
  onChange,
}: {
  activeFocus: FocusFilter;
  onChange: (focus: FocusFilter) => void;
}) {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border-subtle bg-bg-elevated/60 p-1.5 backdrop-blur">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {FOCUS_OPTIONS.map((option) => {
          const active = activeFocus === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              className={`relative min-h-16 rounded-xl px-3 py-2 text-left transition-colors ${
                active ? "text-text-primary" : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="cv-focus-tab"
                  className="absolute inset-0 rounded-xl bg-bg-hover ring-1 ring-border-subtle"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative block text-[10px] uppercase tracking-wider text-text-muted">{option.eyebrow}</span>
              <span className="relative mt-0.5 block text-sm font-semibold">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SignalPanel({ activeFocus }: { activeFocus: FocusFilter }) {
  const active = FOCUS_OPTIONS.find((option) => option.id === activeFocus) ?? FOCUS_OPTIONS[0];

  return (
    <motion.aside
      key={active.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-black/40 p-4 font-mono text-xs shadow-2xl backdrop-blur"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-indigo-300">profile.scope</span>
        <span className="text-pink-300">{active.id.toUpperCase()}</span>
      </div>
      <p className="leading-relaxed text-zinc-300">{active.summary}</p>
      <div className="mt-4 grid gap-2">
        {PROFILE_SIGNALS.map((signal) => (
          <div key={signal} className="flex items-center gap-2 text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            {signal}
          </div>
        ))}
      </div>
    </motion.aside>
  );
}

function TimelineCard({
  entry,
  highlightedTag,
  onHover,
}: {
  entry: CVEntry;
  highlightedTag: string | null;
  onHover: (t: string | null) => void;
}) {
  const accent = accentClass[entry.accent ?? "indigo"];

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="relative pl-9"
    >
      <span className="absolute left-[7px] top-7 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 ring-4 ring-bg-base" />
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-bg-elevated/75 p-5 shadow-[var(--shadow-card)] backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] ${accent} ${matchClass(
          entry.tags,
          highlightedTag,
        )}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_34%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div>
              <h3 className="text-base font-semibold text-text-primary">{entry.title}</h3>
              {entry.org && <div className="mt-0.5 text-sm text-accent-primary">{entry.org}</div>}
            </div>
            {entry.period && <span className="font-mono text-xs text-text-muted">{entry.period}</span>}
          </div>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-text-secondary">
            {entry.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-secondary" />
                <span>
                  <span className="font-semibold text-text-primary">{bullet.boldText}</span>
                  <span className="text-text-muted">{bullet.normalText}</span>
                </span>
              </li>
            ))}
          </ul>
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <Tag key={tag} label={tag} highlightedTag={highlightedTag} onHover={onHover} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function CVPage() {
  const { theme, toggleTheme } = useTheme();
  const reduce = useReducedMotion();
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);
  const [activeFocus, setActiveFocus] = useState<FocusFilter>("all");
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: pageProgress } = useScroll();
  const { scrollYProgress: railProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end end"],
  });

  const visibleSections = useMemo(
    () =>
      CV_SECTIONS.map((section) => ({
        ...section,
        entries: section.entries.filter((entry) => hasFocus(entry, activeFocus)),
      })).filter((section) => section.entries.length > 0),
    [activeFocus],
  );

  return (
    <div className="relative min-h-screen text-text-primary">
      <DecorativeBg />

      <motion.div
        style={{ scaleX: reduce ? 1 : pageProgress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-indigo-400 to-pink-400"
      />

      <header className="sticky top-0 z-50 border-b border-border-subtle backdrop-blur supports-[backdrop-filter]:bg-bg-base/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-accent-primary">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-text-secondary">
            <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Home</Link>
            <Link to="/projects" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Projects</Link>
            <span className="rounded-xl bg-bg-elevated px-3 py-2">Experience</span>
            <button
              onClick={toggleTheme}
              className="ml-1 rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="py-8 text-center">
          <h1 className="mx-auto mt-4 max-w-4xl text-balance bg-gradient-to-r from-indigo-300 via-text-primary to-pink-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
            Jamal Akhras
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            AI/software engineer building reliable ML, data, and workflow systems.
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-pretty leading-relaxed text-text-muted">
            MComp Computer Science & AI graduate from the University of Bath, with production experience across
            FastAPI/Polars orchestration, React/TypeScript workflow tooling, Snowflake/dbt data platforms, and
            PyTorch reinforcement-learning research.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/projects" className="btn-secondary">See projects</Link>
            <a href="#contact" className="btn-tertiary">Get in touch</a>
          </div>

          <FocusTabs activeFocus={activeFocus} onChange={setActiveFocus} />
        </motion.section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div ref={timelineRef} className="relative">
            <span aria-hidden className="absolute left-[7px] top-1 bottom-1 w-px bg-border-subtle" />
            <motion.span
              aria-hidden
              style={{ scaleY: reduce ? 1 : railProgress, transformOrigin: "top" }}
              className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-indigo-400 via-pink-400 to-emerald-400"
            />
            <div className="space-y-12">
              {visibleSections.map((section) => (
                <section key={section.id} id={section.id}>
                  <div className="mb-5 pl-9">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">{section.label}</h2>
                    {section.intro && <p className="mt-1 max-w-2xl text-sm text-text-muted">{section.intro}</p>}
                  </div>
                  <div className="space-y-6">
                    {section.entries.map((entry) => (
                      <TimelineCard
                        key={entry.id}
                        entry={entry}
                        highlightedTag={highlightedTag}
                        onHover={setHighlightedTag}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-24">
            <SignalPanel activeFocus={activeFocus} />

            <section id="skills" className="rounded-2xl border border-border-subtle bg-bg-elevated/70 p-5 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Skills</h2>
              <div className="mt-4 space-y-4">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.group} className={matchClass(group.skills, highlightedTag)}>
                    <div className="mb-2 text-sm font-semibold text-text-primary">{group.group}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => (
                        <Tag key={skill} label={skill} highlightedTag={highlightedTag} onHover={setHighlightedTag} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="beyond" className="rounded-2xl border border-border-subtle bg-bg-elevated/70 p-5 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Beyond Code</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {CV_INTERESTS.map((interest) => (
                  <span key={interest} className="rounded-xl border border-border-subtle bg-bg-hover/50 px-3 py-1.5 text-sm text-text-secondary">
                    {interest}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section id="contact" className="mt-14 rounded-3xl border border-border-subtle bg-gradient-to-br from-indigo-400 to-pink-400 p-6 text-bg-base shadow-2xl sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Let's talk</h2>
              <p className="mt-1 opacity-80">Happy to talk through the engineering, ML, and product work shown here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="mailto:jamal@alakhras.net" className="inline-flex justify-center rounded-2xl bg-bg-base px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-bg-base/90">Email me</a>
              <a href="https://github.com/Jamal-Akhras" target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-2xl bg-black/20 px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-black/30">GitHub</a>
              <a href="https://linkedin.com/in/jamalakhras" target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-2xl bg-black/20 px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-black/30">LinkedIn</a>
            </div>
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link to="/" className="btn-tertiary">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
