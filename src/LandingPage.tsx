import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { Link } from "react-router-dom";

// Components
import DecorativeBg from "./components/DecorativeBg";
import { SunIcon, MoonIcon, MenuIcon, XIcon } from "./components/icons";
import { NeuralNetwork } from "./components/NeuralNetwork";
import { Terminal } from "./components/Terminal";

// Hooks
import { useTheme } from "./hooks/useTheme";
import { useMousePosition } from "./hooks/useMousePosition";

// Constants
import { fadeUp, fade } from "./constants/animations";
import { NAV_LINKS, type ActiveNode } from "./constants/terminalContent";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<ActiveNode>(null);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);

  // State-based reveal
  const [isRevealed, setIsRevealed] = useState(false);
  const [gatesOpen, setGatesOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const quoteContainerRef = useRef<HTMLDivElement>(null);
  const [corners, setCorners] = useState<{x: number; y: number}[]>([]);
  const mousePos = useMousePosition(isQuoteHovered && !isRevealed);

  // Delay neural network interactivity until gates finish animating
  useEffect(() => {
    if (isRevealed) {
      const timer = setTimeout(() => setGatesOpen(true), reduceMotion ? 0 : 500);
      return () => clearTimeout(timer);
    } else {
      setGatesOpen(false);
    }
  }, [isRevealed, reduceMotion]);

  // Exact cursor position (relative to the quote container) drives the reticle;
  // a spring follows it for the "silky elastic" vector lines.
  const springConfig = { stiffness: 150, damping: 15 };
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  // Track the cursor against the container's live rect so the reticle stays
  // aligned regardless of scroll position or layout shifts.
  useEffect(() => {
    const rect = quoteContainerRef.current?.getBoundingClientRect();
    if (rect) {
      cursorX.set(mousePos.x - rect.left);
      cursorY.set(mousePos.y - rect.top);
    }
  }, [mousePos.x, mousePos.y, cursorX, cursorY]);

  // Calculate corner positions with resize handling
  useEffect(() => {
    const updateDimensions = () => {
      if (quoteContainerRef.current) {
        const rect = quoteContainerRef.current.getBoundingClientRect();
        setCorners([
          { x: 0, y: 0 },                        // top-left (relative)
          { x: rect.width, y: 0 },               // top-right
          { x: 0, y: rect.height },              // bottom-left
          { x: rect.width, y: rect.height }      // bottom-right
        ]);
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (quoteContainerRef.current) resizeObserver.observe(quoteContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div id="top" className="min-h-screen">
      <DecorativeBg />

      {/* Header */}
      <motion.header
        variants={fade}
        initial="hidden"
        animate="show"
        className="sticky top-0 z-50 border-b border-border-subtle backdrop-blur supports-[backdrop-filter]:bg-bg-base/60"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="text-lg font-extrabold tracking-tight">
            J<span className="text-accent-primary">.</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-text-secondary md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">
                {link.label}
              </a>
            ))}
            <Link to="/projects" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">Projects</Link>
            <Link to="/cv" className="rounded-xl px-3 py-2 transition-colors hover:bg-bg-hover">CV</Link>
            <button
              onClick={toggleTheme}
              className="ml-2 rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl p-2 transition-colors hover:bg-bg-hover"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-border-subtle bg-bg-base/95 backdrop-blur md:hidden"
            >
              <nav className="flex flex-col px-4 py-4">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-3 text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  to="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-text-secondary transition-colors hover:bg-bg-hover"
                >
                  Projects
                </Link>
                <Link
                  to="/cv"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-text-secondary transition-colors hover:bg-bg-hover"
                >
                  CV
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
        {/* Hero with State-Based Reveal */}
        <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 sm:pt-32">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center">

            {/* Main reveal container - only contains the quote */}
            <div
              ref={quoteContainerRef}
              className={`relative mx-auto ${
                isRevealed && activeNode ? "max-w-6xl" : "max-w-4xl"
              }`}
              style={{ minHeight: isRevealed ? "auto" : "280px" }}
              onMouseEnter={() => setIsQuoteHovered(true)}
              onMouseLeave={() => setIsQuoteHovered(false)}
            >
              <motion.div
                className={isRevealed ? "relative z-10" : "absolute inset-0 z-10 flex items-center justify-center"}
                style={{ pointerEvents: gatesOpen ? "auto" : "none" }}
                animate={{
                  opacity: isRevealed ? 1 : 0.05,
                  filter: isRevealed ? "blur(0px)" : "blur(12px)"
                }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 20 }}
              >
                <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-6 transition-all duration-700 lg:flex-row lg:gap-12">
                  <motion.div
                    className="flex w-full flex-[1.2] items-center justify-center transform-gpu-3d"
                    layout={reduceMotion ? undefined : "position"}
                    transition={{ layout: { type: "spring", stiffness: 180, damping: 28 } }}
                  >
                    <NeuralNetwork activeNode={activeNode} setActiveNode={setActiveNode} isActive={isRevealed} />
                  </motion.div>

                  <AnimatePresence mode="popLayout">
                    {isRevealed && activeNode && (
                      <motion.div
                        key="terminal"
                        className="w-full max-w-[550px] transform-gpu-3d"
                        style={{
                          transformOrigin: "left center",
                          transformPerspective: 1400,
                          borderRadius: "0.75rem",
                          boxShadow: "0 0 30px rgba(129,140,248,0.18)",
                        }}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: -35, scale: 0.96 }}
                        animate={{
                          opacity: 1,
                          rotateY: 0,
                          scale: 1,
                          transition: reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 24 },
                        }}
                        exit={
                          reduceMotion
                            ? { opacity: 0, transition: { duration: 0 } }
                            : { opacity: 0, scale: 0.95, transition: { duration: 0.26, ease: "easeInOut" } }
                        }
                      >
                        <Terminal activeNode={activeNode} onClose={() => setActiveNode(null)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <div style={{ perspective: "1200px", transformStyle: "preserve-3d" }} className="absolute inset-0 z-20 pointer-events-none">
                <motion.div
                  className={`absolute inset-0 flex items-center justify-center transform-gpu-3d ${
                    isRevealed ? "gate-glow-top" : ""
                  }`}
                  style={{
                    clipPath: "inset(0 0 49.5% 0)",
                    transformOrigin: "top",
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "visible"
                  }}
                  animate={{
                    rotateX: isRevealed && !reduceMotion ? 88 : 0,
                    opacity: isRevealed ? reduceMotion ? 0 : 0.4 : 1
                  }}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 15 }}
                >
                  <h1 className={`text-balance text-5xl font-extrabold tracking-tight sm:text-7xl text-center px-4 transition-colors duration-500 ${
                    isRevealed ? "text-text-secondary" : "text-text-primary"
                  }`}>
                    "Good code is wasted if nobody can figure out how to use it."
                  </h1>
                </motion.div>

                <motion.div
                  className={`absolute inset-0 flex items-center justify-center overflow-hidden transform-gpu-3d ${
                    isRevealed ? "gate-glow-bottom" : ""
                  }`}
                  style={{
                    clipPath: "inset(49.5% 0 0 0)",
                    transformOrigin: "bottom",
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "visible"
                  }}
                  animate={{
                    rotateX: isRevealed && !reduceMotion ? -88 : 0,
                    opacity: isRevealed ? reduceMotion ? 0 : 0.4 : 1
                  }}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 15 }}
                >
                  <h1 className={`text-balance text-5xl font-extrabold tracking-tight sm:text-7xl text-center px-4 transition-colors duration-500 ${
                    isRevealed ? "text-text-secondary" : "text-text-primary"
                  }`}>
                    "Good code is wasted if nobody can figure out how to use it."
                  </h1>
                </motion.div>
              </div>

              {/* Physical Switch - attached to top gate, OUTSIDE pointer-events-none container */}
              <motion.div
                className="absolute top-0 left-4 h-1/2 flex items-end justify-start z-30"
                style={{
                  perspective: "1200px",
                  transformOrigin: "top",
                  transformStyle: "preserve-3d"
                }}
                animate={{
                  rotateX: isRevealed && !reduceMotion ? 88 : 0
                }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 15 }}
              >
                <motion.button
                  className="px-4 py-1.5 font-mono text-xs text-indigo-400 bg-black/80 border border-indigo-500/40 rounded-b transition-colors duration-200 hover:text-pink-500 hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(244,114,182,0.3)]"
                  style={{
                    transformOrigin: "top",
                    transformStyle: "preserve-3d",
                    pointerEvents: isRevealed ? "auto" : "none"
                  }}
                  animate={{
                    rotateX: isRevealed && !reduceMotion ? -88 : -90,
                    opacity: isRevealed ? 1 : 0
                  }}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 15, delay: 0.1 }}
                  onClick={() => {
                    setIsRevealed(false);
                    setActiveNode(null);
                  }}
                >
                  [ CLOSE_QUOTE ]
                </motion.button>
              </motion.div>

              {/* Layer 3: Vector Cursor Lines (z-30) - uses spring-smoothed coordinates */}
              {!isRevealed && corners.length > 0 && (
                <svg
                  className="absolute inset-0 z-30 w-full h-full pointer-events-none transition-opacity duration-300"
                  style={{ opacity: isQuoteHovered ? 1 : 0 }}
                >
                  <defs>
                    <linearGradient id="vectorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#f472b6" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  {corners.map((corner, i) => (
                    <motion.line
                      key={i}
                      x1={smoothX}
                      y1={smoothY}
                      x2={corner.x}
                      y2={corner.y}
                      stroke="url(#vectorGradient)"
                      strokeWidth={1}
                      className="animate-vector-line"
                    />
                  ))}
                  <motion.g style={{ x: cursorX, y: cursorY }}>
                    <circle r="9" fill="none" stroke="#a5b4fc" strokeWidth="1" />
                    <line x1="-14" x2="14" stroke="#a5b4fc" strokeWidth="1" />
                    <line y1="-14" y2="14" stroke="#a5b4fc" strokeWidth="1" />
                    <circle r="2" fill="#f472b6" />
                  </motion.g>
                </svg>
              )}

              {/* Layer 4: Click trigger */}
              {!isRevealed && (
                <div
                  className="absolute inset-0 z-40"
                  style={{ cursor: "none" }}
                  onClick={() => setIsRevealed(true)}
                />
              )}

                          </div>

            {/* Attribution - OUTSIDE quoteContainerRef, slides down and fades */}
            <motion.p
              className="mx-auto mt-5 max-w-2xl text-pretty text-base text-text-secondary sm:text-lg text-center"
              animate={{
                opacity: isRevealed ? 0 : 1,
                y: isRevealed ? 30 : 0
              }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
            >
              ~Gandhi (Probably)
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="mt-8 flex items-center justify-center gap-3"
              animate={{
                opacity: isRevealed ? 0 : 1,
                y: isRevealed ? 20 : 0
              }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
            >
              <Link to="/projects" className="btn-secondary">
                See Projects
              </Link>
              <a href="#contact" className="btn-tertiary">
                Get in touch
              </a>
              <Link to="/cv" className="btn-tertiary">
                Explore CV
              </Link>
            </motion.div>

            {/* Stats - always visible */}
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { k: "MComp(hons) CS & AI", v: "University of Bath" },
                { k: "Blues Award", v: "Lacrosse 1st Team Captain" },
                { k: "IMC Prosperity Challenge", v: "Top 10% Globally" },
                { k: "Bath Hackathon", v: "Tech for Good Winner" },
              ].map((s) => (
                <div key={s.k} className="card px-4 py-4 backdrop-blur">
                  <dt className="text-sm text-text-secondary">{s.k}</dt>
                  <dd className="text-2xl font-extrabold text-text-primary">{s.v}</dd>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Contact / CTA */}
        <section id="contact" className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="rounded-3xl border border-border-subtle bg-gradient-to-br from-indigo-400 to-pink-400 p-6 text-bg-base shadow-2xl sm:p-10"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-extrabold sm:text-3xl">Let's talk</h2>
                <p className="mt-1 opacity-80">Open to SWE/ML roles. Happy to have a conversation about my projects or anything else.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <a href="mailto:jamal@alakhras.net" className="inline-flex justify-center rounded-2xl bg-bg-base px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-bg-base/90">Email me</a>
                <a href="https://github.com/Jamal-Akhras" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#24292e] px-5 py-3 font-semibold text-white ring-1 ring-black/10 transition hover:bg-[#2f363d]">GitHub</a>
                <a href="https://linkedin.com/in/jamal-akhras-43120b358" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A66C2] px-5 py-3 font-semibold text-white ring-1 ring-[#0A66C2]/30 hover:bg-[#004182] transition">LinkedIn</a>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-text-muted sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Jamal Akhras — Built with React & Tailwind
        </div>
      </footer>
    </div>
  );
}
