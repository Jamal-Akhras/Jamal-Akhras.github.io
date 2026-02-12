import { motion, AnimatePresence } from "framer-motion";
import { TypewriterLine } from "./TypewriterLine";
import { TERMINAL_CONTENT, type ActiveNode } from "../constants/terminalContent";

interface TerminalProps {
  activeNode: ActiveNode;
  onClose: () => void;
}

function getLineClassName(line: string): string {
  if (line.startsWith("[PROJECT]")) return "text-indigo-400 pl-2 border-l border-indigo-500/30";
  if (line.startsWith("[MATCH]")) return "text-pink-400 pl-2 border-l border-pink-500/30";
  if (line.startsWith("[INFO]")) return "text-amber-400 pl-2 border-l border-amber-500/30";
  if (line.startsWith("[SYSTEM]")) return "text-cyan-400 pl-2 border-l border-cyan-500/30";
  if (line.startsWith("[CORE]")) return "text-indigo-300 pl-2 border-l border-indigo-400/30";
  if (line.startsWith("[SKILLS]")) return "text-pink-300 pl-2 border-l border-pink-400/30";
  if (line.startsWith("[PRINCIPLE]")) return "text-emerald-400 pl-2 border-l border-emerald-500/30 font-semibold";
  if (line.startsWith("[DETAIL]")) return "text-emerald-300/80 pl-4 border-l border-emerald-500/20 text-xs";
  if (line === "") return "h-3";
  return "text-zinc-300 pl-2";
}

export function Terminal({ activeNode, onClose }: TerminalProps) {
  const content = activeNode ? TERMINAL_CONTENT[activeNode] : null;

  return (
    <div className="relative w-[550px] rounded-xl overflow-hidden font-mono text-sm shadow-2xl border border-indigo-500/30 bg-black/80 backdrop-blur-xl terminal-scanline">
      {/* HUD corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-indigo-400/50 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-pink-400/50 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-indigo-400/50 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-pink-400/50 rounded-br-xl pointer-events-none" />

      {/* HUD header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-pink-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-indigo-400 animate-ping opacity-50" />
          </div>
          <span className="text-indigo-300 text-xs font-semibold tracking-wider uppercase">
            System Terminal
          </span>
          {activeNode && (
            <span className="text-pink-400 text-xs">
              [{activeNode.toUpperCase()}]
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-zinc-400 hover:text-pink-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Terminal content */}
      <div className="p-4 h-[280px] overflow-y-auto text-left">
        <AnimatePresence mode="wait">
          {content ? (
            <motion.div
              key={activeNode}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className={content.imageSrc ? "grid grid-cols-5 gap-6" : ""}>
                <div className={content.imageSrc ? "col-span-3" : ""}>
                  <div className="mb-3 flex items-start gap-2">
                    <span className="text-pink-400 select-none">&gt;</span>
                    <TypewriterLine
                      text={content.command}
                      delay={0}
                      className="text-indigo-400 inline"
                    />
                  </div>
                  <div className="h-px bg-gradient-to-r from-indigo-500/30 via-pink-500/30 to-transparent mb-3" />
                  {content.lines.map((line, i) => (
                    <TypewriterLine
                      key={i}
                      text={line}
                      delay={content.command.length * 20 + 300 + i * 120}
                      className={getLineClassName(line)}
                    />
                  ))}
                </div>

                {content.imageSrc && (
                  <div className="col-span-2">
                    <motion.div
                      className="relative overflow-hidden rounded-lg border border-indigo-500/30"
                      style={{ transformOrigin: "top" }}
                      initial={{ scaleY: 0, opacity: 0, x: 0 }}
                      animate={{
                        scaleY: 1,
                        opacity: 1,
                        x: [0, -1, 1, 0]
                      }}
                      transition={{
                        scaleY: { duration: 0.8, ease: [0.33, 1, 0.68, 1], delay: 0.4 },
                        opacity: { duration: 0.8, ease: [0.33, 1, 0.68, 1], delay: 0.4 },
                        x: { duration: 0.4, delay: 0.4, times: [0, 0.33, 0.66, 1] }
                      }}
                    >
                      <img
                        src={content.imageSrc}
                        alt=""
                        loading="eager"
                        className="w-full h-auto object-cover"
                        style={{ filter: "saturate(0.7) contrast(1.2) brightness(0.9)" }}
                      />
                      <motion.div
                        className="absolute inset-0 transmission-noise"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                      />
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex flex-col items-center justify-center h-[240px]"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border border-pink-500/30 flex items-center justify-center animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-pink-500/20 flex items-center justify-center">
                      <span className="text-indigo-400 text-lg animate-pulse">▌</span>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-pink-400" />
                </div>
              </div>
              <p className="text-indigo-400 font-semibold tracking-wider">AWAITING INPUT</p>
              <p className="text-zinc-500 text-xs mt-1">Select a processing node</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-1.5 border-t border-white/10 bg-black/50 flex items-center justify-between text-[10px]">
        <span className="text-zinc-500">NEURAL_TERMINAL v2.0</span>
        <div className="flex items-center gap-3">
          <span className="text-indigo-400">SYS: ONLINE</span>
          <span className="text-pink-400">MEM: 98%</span>
        </div>
      </div>
    </div>
  );
}
