export type ActiveNode = "core" | "values" | "academics" | "athletics" | "interests" | null;

export interface TerminalContentItem {
  command: string;
  lines: string[];
  imageSrc?: string;
}

export const TERMINAL_CONTENT: Record<NonNullable<ActiveNode>, TerminalContentItem> = {
  core: {
    command: "whoami --verbose",
    lines: [
      "[SYSTEM] User: Jamal Akhras",
      "[SYSTEM] Role: CS & AI Engineer",
      "",
      "[CORE] Building reliable ML systems with clean APIs",
      "[CORE] Bridging research and production code",
      "[CORE] Focus: Reproducible training, scalable inference",
      "",
      "[SKILLS] Python • PyTorch • TypeScript • React",
      "[SKILLS] Reinforcement Learning • Control Systems",
      "[SKILLS] MLOps • Docker • AWS",
    ],
  },
  academics: {
    command: "cat academics.log",
    lines: [
      "[INFO] MComp (Hons) Computer Science & AI — University of Bath",
      "[INFO] Focus: Reliable ML systems, clean APIs, reproducible training",
      "",
      "[PROJECT] PPO with Adversarial Motion Priors for Rehabilitation",
      "[PROJECT] RL with AMP for Surface EMG-Driven Prosthetic Control",
      "[PROJECT] Obstruction Detection AI for Train Platforms",
      "[PROJECT] LSTM Based Stock Predictor",
      "[PROJECT] Constraint Propagation Sudoku Solving AI",
      "[PROJECT] Object Detection Lacrosse Stick & Athlete Tracking",
    ],
  },
  athletics: {
    command: 'grep "leadership" profile',
    lines: [
      "[MATCH] Bath Lacrosse 1st Team Captain",
      "[MATCH] Set training standards and team culture",
      "[MATCH] Bath Lacrosse Social Secretary",
      "[MATCH] 2x English Universities Representative",
      "[MATCH] Blues Award Recipient",
    ],
    imageSrc: "/images/extras-1.webp",
  },
  interests: {
    command: "finger jamal",
    lines: [
      "Login: jamal",
      "Directory: /home/jamal",
      "Shell: /bin/zsh",
      "",
      "Peak Chess ELO: 2256",
      "Golf Handicap: Low Single Digit",
      "Status: Part-time Self-Proclaimed Chef",
    ],
    imageSrc: "/images/extras-2.webp",
  },
  values: {
    command: "cat /etc/principles.conf",
    lines: [
      "[PRINCIPLE] Team-first leadership",
      "[DETAIL] Captain Mindset: Standards, Accountability, Support",
      "",
      "[PRINCIPLE] Boring is beautiful",
      "[DETAIL] Logs, docs, and alerts so future-me says thanks",
      "",
      "[PRINCIPLE] Curiosity with discipline",
      "[DETAIL] Prototype fast; benchmark and reproduce before scaling",
    ],
  },
};

export const NAV_LINKS = [
  { href: "#contact", label: "Contact" },
];
