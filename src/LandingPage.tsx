import { motion, type Variants } from "framer-motion";
import { Link } from "react-router-dom";

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const fade: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

/**
 * Landing page — v4 (pretty + smooth, with Projects links)
 * - Header nav includes a Projects link → "/projects"
 * - Hero primary CTA goes to "/projects" (secondary = #contact)
 * - Single page sections: #about, #values, #contact
 *
 * Requirements:
 *   npm i framer-motion react-router-dom
 *   Tailwind v4 + @tailwindcss/postcss already set up; index.css includes Tailwind and optional base tweaks.
 */

export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen">
      {/* Decorative background: grid + soft blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
        <div className="absolute -top-24 -left-32 h-[65vmax] w-[65vmax] rounded-full blur-3xl opacity-25 bg-[radial-gradient(circle_at_30%_30%,#8aa2ff_0%,transparent_60%)]" />
        <div className="absolute -bottom-32 -right-32 h-[65vmax] w-[65vmax] rounded-full blur-3xl opacity-25 bg-[radial-gradient(circle_at_65%_40%,#ff86cf_0%,transparent_60%)]" />
      </div>

      {/* Header */}
      <motion.header
        variants={fade}
        initial="hidden"
        animate="show"
        className="sticky top-0 z-50 border-b border-white/10/50 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/60"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="text-lg font-extrabold tracking-tight">
            J<span className="text-indigo-400">.</span>
          </a>
          <nav className="flex items-center gap-1 text-zinc-300">
            <a href="#about" className="rounded-xl px-3 py-2 hover:bg-white/5">About</a>
            <a href="#values" className="rounded-xl px-3 py-2 hover:bg-white/5">Values</a>
            <a href="#contact" className="rounded-xl px-3 py-2 hover:bg-white/5">Contact</a>
            <Link to="/projects" className="rounded-xl px-3 py-2 hover:bg-white/5">Projects</Link>
          </nav>
        </div>
      </motion.header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 sm:pt-32">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              [Master of Computing with Honors in Computer Science and Artificial Intelligence / Software/AI Engineer]
            </span>
            <h1 className="mx-auto mt-4 max-w-5xl text-balance text-5xl font-extrabold tracking-tight sm:text-7xl">
              <span className="bg-gradient-to-br from-indigo-200 via-white to-pink-200 bg-clip-text text-transparent">
                Practical ML, Polished Fronts.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-zinc-300 sm:text-lg">
              [Part Toy Maker - Part Software/AI Engineer. I like turning random ideas into things you can try.]
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                to="/projects"
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/90 px-5 py-3 font-semibold text-[#0b0c10] shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                See Projects
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Get in touch
              </a>
            </div>

        {/* Stats */}
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { k: "MComp(hons) CS & AI",   v: "University of Bath" },
                { k: "Blues Award",     v: "Lacrosse 1st Team Captain"},
                { k: "IMC Prosperity Challenge", v: "Top 10% Globally" },
                { k: "Bath Hackathon",         v: "Tech for Good Winner" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
                >
                  <dt className="text-sm text-zinc-300">{s.k}</dt>
                  <dd className="text-2xl font-extrabold text-white">{s.v}</dd>
                </div>
              ))}
          </div>
          </motion.div>
        </section>

        {/* About */}
        <section id="about" className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl sm:p-8 backdrop-blur"
          >
            <h2 className="text-2xl font-bold sm:text-3xl">About me</h2>
            <div className="mt-3 space-y-3 text-zinc-300">
              <p>Something Cool</p>
              <p>Will Be Coming</p>
              <ul className="grid list-disc gap-1 pl-5">
                <li>Here</li>
                <li>Very</li>
                <li>Soon</li>
              </ul>
            </div>
          </motion.div>
        </section>

        {/* Values */}
        <section id="values" className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold sm:text-3xl">What I care about</h2>
            <p className="max-w-xl text-zinc-300">Small details that feel good, big things that just work.</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Clarity & Speed", body: "Ship minimal surfaces, measure performance, cut noise.", icon: "⚡" },
              { title: "Practical ML", body: "Turn RL/vision work into usable products.", icon: "🎯" },
              { title: "Reliable Engineering", body: "Testing, reproducible pipelines, and sensible cloud.", icon: "🧠" },
            ].map((c) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/30 to-pink-400/30 text-lg">
                  {c.icon}
                </div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-zinc-300">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact / CTA */}
        <section id="contact" className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-400 to-pink-400 p-6 text-[#0b0c10] shadow-2xl sm:p-10"
          >
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Let’s talk</h2>
                <p className="mt-1 opacity-80">Open to SWE/ML roles. Happy to have a conversation about my projects or anything else.</p>
              </div>
              <div className="flex gap-3">
                <a href="mailto:jamal@alakhras.net" className="inline-flex rounded-2xl bg-[#0b0c10] px-5 py-3 font-semibold text-white ring-1 ring-black/10">Email me</a>
                <a href="https://github.com/Jamal-Akhras" target="_blank" rel="noreferrer" className="inline-flex rounded-2xl border border-[#0b0c10]/20 bg-white/90 px-5 py-3 font-semibold">GitHub</a>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10/50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-zinc-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Jamal Akhras — Built with React & Tailwind
        </div>
      </footer>
    </div>
  );
}
