import { motion, useReducedMotion } from "framer-motion";

export default function DecorativeBg() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid pattern */}
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

      {/* Animated blob 1 - Primary accent (top-left) */}
      <motion.div
        className="absolute -top-24 -left-32 h-[65vmax] w-[65vmax] rounded-full blur-3xl"
        style={{
          opacity: 'var(--blob-opacity)',
          background: 'radial-gradient(circle at 30% 30%, var(--blob-primary) 0%, transparent 60%)',
        }}
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, 80, -40, 100, 0],
                y: [0, 100, 150, 50, 0],
                scale: [1, 1.15, 0.9, 1.1, 1],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 15, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* Animated blob 2 - Secondary accent (bottom-right) */}
      <motion.div
        className="absolute -bottom-32 -right-32 h-[65vmax] w-[65vmax] rounded-full blur-3xl"
        style={{
          opacity: 'var(--blob-opacity)',
          background: 'radial-gradient(circle at 65% 40%, var(--blob-secondary) 0%, transparent 60%)',
        }}
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, -100, 60, -80, 0],
                y: [0, -80, -120, 60, 0],
                scale: [1, 0.85, 1.15, 0.92, 1],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
      />
    </div>
  );
}
