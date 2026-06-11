import { motion, useReducedMotion } from "framer-motion";

export default function DecorativeBg() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Technical grid and vignette */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 'var(--grid-opacity)',
          backgroundImage: `
            linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 35%, transparent 0%, var(--vignette-color) 78%),
            linear-gradient(115deg, transparent 0%, var(--scan-glow) 48%, transparent 55%)
          `,
        }}
      />

      {/* Restrained atmospheric glows */}
      <motion.div
        className="absolute -top-20 -left-24 h-[42vmax] w-[42vmax] rounded-full blur-3xl"
        style={{
          opacity: 'var(--blob-opacity)',
          background: 'radial-gradient(circle at 30% 30%, var(--blob-primary) 0%, transparent 68%)',
        }}
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, 28, -12, 0],
                y: [0, 36, 18, 0],
                scale: [1, 1.06, 0.98, 1],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 24, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* Animated blob 2 - Secondary accent (bottom-right) */}
      <motion.div
        className="absolute -bottom-24 -right-24 h-[38vmax] w-[38vmax] rounded-full blur-3xl"
        style={{
          opacity: 'var(--blob-opacity)',
          background: 'radial-gradient(circle at 65% 40%, var(--blob-secondary) 0%, transparent 70%)',
        }}
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, -32, 14, 0],
                y: [0, -24, -42, 0],
                scale: [1, 0.96, 1.05, 1],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 28, repeat: Infinity, ease: "easeInOut" }
        }
      />
    </div>
  );
}
