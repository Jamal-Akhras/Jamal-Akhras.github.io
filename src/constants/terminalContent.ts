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
      "[SYSTEM] Role: Software / Applied AI Engineer",
      "",
      "[CORE] Building reliable backend, ML, and workflow systems",
      "[CORE] Bridging production software with applied AI research",
      "[CORE] Focus: orchestration, evaluation, auditability, tests",
      "",
      "[SKILLS] Python | FastAPI | Polars | TypeScript | React",
      "[SKILLS] PyTorch | Reinforcement Learning | Evaluation",
      "[SKILLS] Snowflake | dbt | Postgres | Reliability controls",
    ],
  },
  academics: {
    command: "cat academics.log",
    lines: [
      "[INFO] MComp (Hons) Computer Science & AI - University of Bath",
      "[INFO] Focus: reinforcement learning, simulation, ML systems",
      "",
      "[PROJECT] EMG-driven prosthetic hand control with PPO/AMP",
      "[PROJECT] Exoskeleton control in PyBullet and Isaac Gym",
      "[PROJECT] AI-Trader leakage-guarded financial ML pipeline",
      "[PROJECT] PokerAI deterministic engine and RL training stack",
      "[PROJECT] Verdict auditable agent orchestration and evaluation",
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
      "Golf Handicap: +1",
      "Status: Part-time self-proclaimed chef",
    ],
    imageSrc: "/images/extras-2.webp",
  },
  values: {
    command: "cat /etc/principles.conf",
    lines: [
      "[PRINCIPLE] Team-first leadership",
      "[DETAIL] Captain mindset: standards, accountability, support",
      "",
      "[PRINCIPLE] Boring is beautiful",
      "[DETAIL] Logs, tests, and docs so future-me says thanks",
      "",
      "[PRINCIPLE] Curiosity with discipline",
      "[DETAIL] Prototype fast; test and reproduce before scaling",
    ],
  },
};

export const NAV_LINKS = [
  { href: "#contact", label: "Contact" },
];
