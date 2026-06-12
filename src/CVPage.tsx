import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useReducedMotion, useInView, animate } from "framer-motion";
import DecorativeBg from "./components/DecorativeBg";
import { SunIcon, MoonIcon } from "./components/icons";
import { useTheme } from "./hooks/useTheme";
import { fadeUp } from "./constants/animations";
import {
  CV_METRICS,
  CV_SECTIONS,
  SKILL_GROUPS,
  CV_INTERESTS,
  type CVMetric,
  type CVEntry,
  type CVCategory,
} from "./constants/cv";

const RESUME_URL = "/resume.pdf"; // drop resume.pdf into /public to enable

const CATEGORY_COLOR: Record<CVCategory, string> = {
  "ml-ai": "#818cf8", // indigo
  "systems-infra": "#34d399", // emerald
  "quant-logic": "#f472b6", // pink
};

// ---- Honest micro-charts (single-value / derived only — no fabricated series) ----

function MiniDonut({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 14;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 40 40" className="h-14 w-14">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle
            key={i}
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 20 20)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function MiniArc({ percent }: { percent: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const len = (percent / 100) * c;
  return (
    <svg viewBox="0 0 40 40" className="h-14 w-14">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="#818cf8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${len} ${c - len}`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

function CountUp({ metric }: { metric: CVMetric }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(reduce ? metric.value : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(0, metric.value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, metric.value, reduce]);

  return (
    <span ref={ref} className="font-mono text-3xl font-extrabold text-text-primary sm:text-4xl">
      {metric.prefix}
      {n}
      {metric.suffix}
    </span>
  );
}

// ---- Cross-linking tag pill ----

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
          ? "bg-accent-primary/15 text-text-primary ring-accent-primary/50"
          : "bg-bg-hover text-text-secondary ring-border-subtle"
      }`}
    >
      {label}
    </span>
  );
}

// Constructive highlight (border + faint glow) for any card/group that contains
// the hovered tag — no dimming of others, no layout shift (border already 1px).
function matchClass(tags: string[] | undefined, highlightedTag: string | null) {
  return highlightedTag && tags?.includes(highlightedTag)
    ? "border-accent-primary/60 bg-accent-primary/[0.06]"
    : "";
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
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="relative pl-10"
    >
      <motion.span
        initial={{ opacity: 0.3 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        className="absolute left-[7px] top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 ring-4 ring-bg-base"
      />
      <div className={`card p-5 ${matchClass(entry.tags, highlightedTag)}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-semibold text-text-primary">{entry.title}</h3>
          {entry.period && <span className="font-mono text-xs text-text-muted">{entry.period}</span>}
        </div>
        {entry.org && <div className="text-sm text-accent-primary">{entry.org}</div>}
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-secondary">
          {entry.bullets.map((b, i) => (
            <li key={i}>
              <span className="select-none text-accent-primary">▸ </span>
              <span className="font-semibold text-text-primary">{b.boldText}</span>
              <span className="text-text-muted">{b.normalText}</span>
            </li>
          ))}
        </ul>
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.tags.map((t) => (
              <Tag key={t} label={t} highlightedTag={highlightedTag} onHover={onHover} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function CVPage() {
  const { theme, toggleTheme } = useTheme();
  const reduce = useReducedMotion();
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);

  const { scrollYProgress: pageProgress } = useScroll();
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: railProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end end"],
  });

  // Donut split derived from real project categories.
  const projectsSection = CV_SECTIONS.find((s) => s.id === "projects");
  const donutSegments = (["ml-ai", "systems-infra", "quant-logic"] as CVCategory[])
    .map((cat) => ({
      value: projectsSection?.entries.filter((e) => e.category === cat).length ?? 0,
      color: CATEGORY_COLOR[cat],
    }))
    .filter((s) => s.value > 0);

  return (
    <div className="relative min-h-screen text-text-primary">
      <DecorativeBg />

      {/* Page scroll progress */}
      <motion.div
        style={{ scaleX: reduce ? 1 : pageProgress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-indigo-400 to-pink-400"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-subtle backdrop-blur supports-[backdrop-filter]:bg-bg-base/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            J<span className="text-accent-primary">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-text-secondary">
            <Link to="/" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Home</Link>
            <Link to="/projects" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Projects</Link>
            <span className="rounded-xl bg-bg-elevated px-3 py-2">CV</span>
            <a href={RESUME_URL} target="_blank" rel="noreferrer" className="ml-1 hidden rounded-xl px-3 py-2 text-accent-primary transition-colors hover:bg-bg-hover sm:inline">
              Download PDF
            </a>
            <button
              onClick={toggleTheme}
              className="ml-1 rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="py-8 text-center">
          <h1 className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
            Jamal Akhras
          </h1>
          <p className="mt-3 text-lg text-text-secondary">CS &amp; AI Engineer · University of Bath</p>
          <p className="mx-auto mt-2 max-w-2xl text-pretty text-text-muted">
            Building reliable ML systems with clean APIs — from research to production.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href={RESUME_URL} target="_blank" rel="noreferrer" className="btn-secondary">Download PDF</a>
            <a href="#contact" className="btn-tertiary">Get in touch</a>
          </div>
        </motion.section>

        {/* Metrics with ambient micro-data */}
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CV_METRICS.map((m) => (
            <div key={m.id} className="card group relative flex flex-col items-center justify-center overflow-hidden px-4 py-5 text-center">
              {m.chart && (
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted opacity-20 transition-opacity duration-300 group-hover:opacity-60">
                  {m.chart.kind === "donut" ? <MiniDonut segments={donutSegments} /> : <MiniArc percent={m.chart.percent} />}
                </div>
              )}
              <div className="relative">
                <CountUp metric={m} />
                <div className="mt-1 text-xs text-text-secondary">{m.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Timeline — one continuous rail tracking scroll progress */}
        <div ref={timelineRef} className="relative mt-12">
          <span aria-hidden className="absolute left-[7px] top-1 bottom-1 w-px bg-border-subtle" />
          <motion.span
            aria-hidden
            style={{ scaleY: reduce ? 1 : railProgress, transformOrigin: "top" }}
            className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-indigo-400 to-pink-400"
          />
          <div className="space-y-12">
            {CV_SECTIONS.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="mb-5 pl-10 text-sm font-semibold uppercase tracking-wider text-text-muted">{section.label}</h2>
                <div className="space-y-6">
                  {section.entries.map((entry) => (
                    <TimelineCard key={entry.id} entry={entry} highlightedTag={highlightedTag} onHover={setHighlightedTag} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Skills */}
        <section id="skills" className="mt-12">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-text-muted">Skills</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {SKILL_GROUPS.map((g) => (
              <motion.div
                key={g.group}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className={`card p-5 ${matchClass(g.skills, highlightedTag)}`}
              >
                <div className="mb-2 text-sm font-semibold text-text-primary">{g.group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.skills.map((s) => (
                    <Tag key={s} label={s} highlightedTag={highlightedTag} onHover={setHighlightedTag} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Beyond code */}
        <section id="beyond" className="mt-12">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-text-muted">Beyond code</h2>
          <div className="flex flex-wrap gap-2">
            {CV_INTERESTS.map((i) => (
              <span key={i} className="rounded-xl border border-border-subtle bg-bg-hover/50 px-3 py-1.5 text-sm text-text-secondary">
                {i}
              </span>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mt-14 rounded-3xl border border-border-subtle bg-gradient-to-br from-indigo-400 to-pink-400 p-6 text-bg-base shadow-2xl sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Let's talk</h2>
              <p className="mt-1 opacity-80">Open to SWE/ML roles — happy to chat about any of the above.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="mailto:jamal@alakhras.net" className="inline-flex justify-center rounded-2xl bg-bg-base px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-bg-base/90">Email me</a>
              <a href={RESUME_URL} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-2xl bg-black/20 px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-black/30">Download PDF</a>
            </div>
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link to="/" className="btn-tertiary">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
