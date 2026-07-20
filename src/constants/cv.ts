// src/constants/cv.ts
// Structured profile data for the interactive experience route.

export interface BulletPoint {
  boldText: string;
  normalText: string;
}

export type CVCategory = "experience" | "project" | "education" | "achievement";
export type CVFocus = "software" | "ml" | "platform";

export interface CVEntry {
  id: string;
  title: string;
  org?: string;
  period?: string;
  bullets: BulletPoint[];
  tags?: string[];
  category: CVCategory;
  focus: CVFocus[];
  accent?: "indigo" | "emerald" | "pink" | "amber";
}

export interface CVSection {
  id: string;
  label: string;
  intro?: string;
  entries: CVEntry[];
}

export interface SkillGroup {
  group: string;
  skills: string[];
}

export interface FocusOption {
  id: "all" | CVFocus;
  label: string;
  eyebrow: string;
  summary: string;
}

export const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: "all",
    label: "Full profile",
    eyebrow: "General view",
    summary: "Production software, AI research, and workflow-platform work in one scan.",
  },
  {
    id: "software",
    label: "Software",
    eyebrow: "Engineering systems",
    summary: "FastAPI services, REST/WebSocket APIs, React tooling, reliability controls, and end-to-end delivery.",
  },
  {
    id: "ml",
    label: "ML / AI",
    eyebrow: "Research to systems",
    summary: "PyTorch RL, simulation, model evaluation, LLM/RAG concepts, and agent tooling.",
  },
  {
    id: "platform",
    label: "Platform",
    eyebrow: "Data and workflow infra",
    summary: "Pipeline orchestration, Snowflake/dbt workflows, third-party integrations, validation, and auditability.",
  },
];

export const PROFILE_SIGNALS = [
  "Production Python orchestration",
  "Auditable AI agent systems",
  "PyTorch RL and evaluation",
  "Reliable backend infrastructure",
];

export const CV_CONTACT_SIGNALS = [
  "Dubai, UAE",
  "jamal@alakhras.net",
  "linkedin.com/in/jamalakhras",
  "github.com/Jamal-Akhras",
];

export const CV_SECTIONS: CVSection[] = [
  {
    id: "experience",
    label: "Professional Experience",
    intro: "Commercial work first: production services, workflow orchestration, integrations, and reliability.",
    entries: [
      {
        id: "omnivista",
        title: "Development Associate",
        org: "OmniVista",
        period: "12/2025 - Present",
        category: "experience",
        focus: ["software", "platform"],
        accent: "indigo",
        tags: ["FastAPI", "Polars", "DAG execution", "WebSocket telemetry", "Snowflake", "dbt", "Testing"],
        bullets: [
          {
            boldText: "Built production Python orchestration services",
            normalText:
              " in FastAPI and Polars, including DAG execution, concurrent source-fetching, cancellation, persistent run state, and WebSocket telemetry.",
          },
          {
            boldText: "Engineered reliability controls",
            normalText:
              " across workflow systems with validation, retry/backoff handling, idempotent delivery, materialisation barriers, automated tests, and operational feedback loops.",
          },
          {
            boldText: "Developed client-facing integration tooling",
            normalText:
              " across React/TypeScript and REST APIs, translating workflow requirements into maintainable backend and frontend components.",
          },
        ],
      },
      {
        id: "interconnect",
        title: "Software Engineering Intern",
        org: "InterConnect",
        period: "06/2024 - 09/2024; 06/2025 - 09/2025",
        category: "experience",
        focus: ["software"],
        accent: "emerald",
        tags: ["React", "Node.js", "SQL", "Testing", "Deployment"],
        bullets: [
          {
            boldText: "Shipped production full-stack features",
            normalText:
              " for the iCampus school-management platform using React, Node.js, and SQL, owning implementation, testing, review, and deployment across two internships.",
          },
        ],
      },
    ],
  },
  {
    id: "projects",
    label: "Selected AI & Engineering Projects",
    intro: "Current strongest project set: RL/control research, agent evaluation, and rigorous applied-ML systems.",
    entries: [
      {
        id: "emg-prosthetic",
        title: "EMG-Driven Prosthetic Hand Control",
        org: "University of Bath",
        period: "09/2024 - 05/2025",
        category: "project",
        focus: ["ml"],
        accent: "pink",
        tags: ["PyTorch", "Isaac Gym", "PPO", "AMP", "Optuna", "Reinforcement Learning"],
        bullets: [
          {
            boldText: "Built a custom PPO control system",
            normalText:
              " with adversarial motion priors, mapping raw sEMG to high-DoF prosthetic hand control across 2,048 parallel Isaac Gym environments.",
          },
          {
            boldText: "Improved zero-shot success on unseen users",
            normalText:
              " from 0.55 to 0.78, training on 27 NinaPro DB1 subjects and evaluating without fine-tuning on a disjoint 40-subject DB2 cohort.",
          },
          {
            boldText: "Ran reproducible experiment batches",
            normalText:
              " with Optuna ablations through SLURM and DDP across 3-5 GPUs, isolating adversarial shaping and predictive/contrastive objectives.",
          },
        ],
      },
      {
        id: "pokerai",
        title: "PokerAI, From-Scratch Multi-Agent RL System",
        period: "2026",
        category: "project",
        focus: ["software", "ml"],
        accent: "indigo",
        tags: ["PyTorch", "PPO", "FastAPI", "bf16 microbatching", "Testing", "RL systems"],
        bullets: [
          {
            boldText: "Built a deterministic 6-max poker engine",
            normalText:
              " and handwritten PPO with illegal-action masking, GAE, KL-target early stopping, entropy annealing, gradient clipping, and checkpointing.",
          },
          {
            boldText: "Added determinism and information-leak tests",
            normalText:
              " plus side-pot coverage, async bf16 GPU microbatching, and a single-node actor-learner broadcasting weights to 12 rollout workers.",
          },
        ],
      },
      {
        id: "ai-trader",
        title: "AI-Trader, Leakage-Guarded ML Research Pipeline",
        period: "2026",
        category: "project",
        focus: ["ml", "platform"],
        accent: "emerald",
        tags: ["Python", "LightGBM", "Pandas", "Walk-forward CV", "Backtesting", "Auditability"],
        bullets: [
          {
            boldText: "Built a leakage-resistant ML evaluation pipeline",
            normalText:
              " with point-in-time features, triple-barrier labels, purged and embargoed walk-forward validation, LightGBM modelling, and cost-aware portfolio backtesting.",
          },
          {
            boldText: "Preserved a negative result",
            normalText:
              " after executable leakage tests and a deflated-Sharpe gate rejected the best model across six horizons and 268 symbols, with experiment fingerprints for reproducibility.",
          },
        ],
      },
      {
        id: "verdict",
        title: "Verdict, Auditable Agent Evaluation & Control",
        period: "2026",
        category: "project",
        focus: ["software", "ml", "platform"],
        accent: "amber",
        tags: ["Postgres", "LLM evaluation", "Approval gates", "Budgets", "Prompt-injection defence", "Regression tests"],
        bullets: [
          {
            boldText: "Built a Postgres-backed agent DAG orchestrator",
            normalText:
              " with human approval gates, per-agent budgets, repeated-run LLM evaluation, failure recovery, and regression-tested indirect prompt-injection defences.",
          },
          {
            boldText: "Focused the system on auditability",
            normalText:
              " by making cost limits, approval pauses, provenance, stale-run recovery, and failure isolation first-class system behaviour.",
          },
        ],
      },
    ],
  },
  {
    id: "education",
    label: "Education",
    entries: [
      {
        id: "bath",
        title: "MComp (Hons) Computer Science & Artificial Intelligence, 2:1",
        org: "University of Bath",
        period: "09/2021 - 05/2025",
        category: "education",
        focus: ["software", "ml"],
        accent: "indigo",
        tags: ["Reinforcement Learning", "Robotics Simulation", "Machine Learning", "Algorithms"],
        bullets: [
          {
            boldText: "Specialised in reinforcement learning and simulation",
            normalText:
              " with broader focus areas across machine learning, algorithms, and software engineering.",
          },
          {
            boldText: "Completed two custom-PPO control dissertations",
            normalText:
              " including earlier exoskeleton rehabilitation control work in PyBullet and Isaac Gym.",
          },
        ],
      },
    ],
  },
  {
    id: "achievements",
    label: "Awards & Leadership",
    entries: [
      {
        id: "hackathon",
        title: "Hackathon Winner - Tech for Good",
        org: "Bath Computer Science Society",
        category: "achievement",
        focus: ["software", "ml"],
        accent: "emerald",
        tags: ["PyTorch", "Computer Vision", "Hackathon"],
        bullets: [
          {
            boldText: "Built a real-time CV safety system",
            normalText:
              " for train-platform obstruction detection, winning the society's Tech for Good award.",
          },
        ],
      },
      {
        id: "lacrosse-captain",
        title: "1st Team Captain",
        org: "University of Bath Lacrosse",
        category: "achievement",
        focus: ["software", "platform"],
        accent: "amber",
        tags: ["Leadership", "Teamwork", "Standards"],
        bullets: [
          {
            boldText: "Led team standards and culture",
            normalText:
              " as 1st Team Captain, 2x English Universities representative, and Blues Award recipient.",
          },
        ],
      },
    ],
  },
];

export const SKILL_GROUPS: SkillGroup[] = [
  {
    group: "Research / ML",
    skills: ["Python", "PyTorch", "Reinforcement Learning", "PPO", "SAC", "AMP", "Reward design", "Optuna"],
  },
  {
    group: "ML Systems",
    skills: ["Isaac Gym", "GPU-accelerated training", "Multiprocess actor-learner systems", "SLURM", "DDP", "Reproducibility"],
  },
  {
    group: "AI Safety / Agents",
    skills: ["LLM evaluation", "Prompt-injection defence", "Human approval gates", "Provenance", "Deterministic safety controls"],
  },
  {
    group: "Backend / Data",
    skills: ["FastAPI", "Postgres", "Pydantic", "Polars", "Snowflake", "dbt", "REST APIs", "WebSocket telemetry"],
  },
];

export const CV_INTERESTS: string[] = [
  "Chess (2256 ELO)",
  "Golf (+1 handicap)",
  "University lacrosse captain",
  "Part-time self-proclaimed chef",
];
