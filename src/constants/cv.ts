// src/constants/cv.ts
// Structured CV data for the interactive /cv journey.
// NOTE: `period` fields are placeholders — fill with real dates; the UI hides
// empty ones. Tag strings are kept consistent with SKILL_GROUPS so the ambient
// hover cross-linking lights up matching projects and skills together.

export interface BulletPoint {
  boldText: string; // 2–4 word high-impact hook
  normalText: string; // supporting detail
}

export type CVCategory = "ml-ai" | "systems-infra" | "quant-logic";

export interface CVEntry {
  id: string;
  title: string;
  org?: string;
  period?: string;
  bullets: BulletPoint[];
  tags?: string[];
  category?: CVCategory; // projects only — drives the metric donut
}

export interface CVSection {
  id: string;
  label: string;
  entries: CVEntry[];
}

export type MetricChart =
  | { kind: "donut" } // derived from real project categories
  | { kind: "arc"; percent: number }; // honest single value (e.g. Top 10% -> 90)

export interface CVMetric {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  chart?: MetricChart; // omit -> plain number
}

export interface SkillGroup {
  group: string;
  skills: string[];
}

export const CV_METRICS: CVMetric[] = [
  { id: "elo", value: 2256, label: "Peak chess ELO" },
  { id: "projects", value: 6, suffix: "+", label: "ML & AI projects", chart: { kind: "donut" } },
  { id: "imc", value: 10, prefix: "Top ", suffix: "%", label: "IMC Prosperity (global)", chart: { kind: "arc", percent: 90 } },
  { id: "hackathon", value: 1, label: "Tech-for-Good hackathon win" },
];

export const CV_SECTIONS: CVSection[] = [
  {
    id: "education",
    label: "Education",
    entries: [
      {
        id: "bath",
        title: "MComp (Hons) Computer Science & AI",
        org: "University of Bath",
        period: "",
        tags: ["Reinforcement Learning", "Computer Vision", "Control Systems"],
        bullets: [
          { boldText: "Focused on reliable ML systems", normalText: " — clean APIs, reproducible training and scalable inference." },
          { boldText: "Research & coursework across", normalText: " reinforcement learning, computer vision and control systems." },
        ],
      },
    ],
  },
  {
    id: "projects",
    label: "Projects & Research",
    entries: [
      {
        id: "ppo-rehab",
        title: "PPO + Adversarial Motion Priors for Rehabilitation",
        org: "University of Bath",
        period: "",
        category: "ml-ai",
        tags: ["PyTorch", "Reinforcement Learning", "PPO", "Physics Sim"],
        bullets: [
          { boldText: "Engineered an RL pipeline", normalText: " producing physically-plausible rehabilitation motion from reference data." },
          { boldText: "Used PPO guided by", normalText: " Adversarial Motion Priors to imitate and smooth natural movement." },
        ],
      },
      {
        id: "emg-prosthetic",
        title: "RL for Surface-EMG-Driven Prosthetic Control",
        period: "",
        category: "ml-ai",
        tags: ["Reinforcement Learning", "Control Systems", "PyTorch"],
        bullets: [
          { boldText: "Mapped surface-EMG signals", normalText: " to natural, stable prosthetic control with RL and Adversarial Motion Priors." },
        ],
      },
      {
        id: "train-obstruction",
        title: "Obstruction Detection for Train Platforms",
        period: "",
        category: "ml-ai",
        tags: ["Computer Vision", "Object Detection", "PyTorch"],
        bullets: [
          { boldText: "Built a CV system", normalText: " that flags platform obstructions for real-time safety monitoring." },
        ],
      },
      {
        id: "lstm-stock",
        title: "LSTM Stock Predictor",
        period: "",
        category: "quant-logic",
        tags: ["LSTM", "Time Series", "PyTorch"],
        bullets: [
          { boldText: "Forecast price movements", normalText: " from historical market data with a reproducible training pipeline." },
        ],
      },
      {
        id: "sudoku",
        title: "Constraint-Propagation Sudoku Solver",
        period: "",
        category: "quant-logic",
        tags: ["Constraint Satisfaction", "Search", "Python"],
        bullets: [
          { boldText: "Solved arbitrary puzzles", normalText: " via constraint propagation combined with backtracking search." },
        ],
      },
      {
        id: "lacrosse",
        title: "Lacrosse Stick & Athlete Tracking",
        period: "",
        category: "ml-ai",
        tags: ["Computer Vision", "Object Detection", "Tracking"],
        bullets: [
          { boldText: "Detected sticks & tracked athletes", normalText: " across match footage for automated performance analysis." },
        ],
      },
    ],
  },
  {
    id: "leadership",
    label: "Leadership & Athletics",
    entries: [
      {
        id: "lacrosse-captain",
        title: "1st Team Captain",
        org: "University of Bath Lacrosse",
        period: "",
        tags: ["Leadership", "Teamwork"],
        bullets: [
          { boldText: "Set training standards", normalText: " and team culture as captain." },
          { boldText: "Social Secretary;", normalText: " 2× English Universities representative." },
          { boldText: "Blues Award recipient", normalText: " for sporting excellence." },
        ],
      },
    ],
  },
  {
    id: "achievements",
    label: "Achievements",
    entries: [
      {
        id: "imc",
        title: "Top 10% Globally — IMC Prosperity Challenge",
        tags: ["Quant", "Algorithms"],
        bullets: [{ boldText: "Algorithmic trading", normalText: " competition against teams worldwide." }],
      },
      {
        id: "hackathon",
        title: "Winner — Bath Hackathon (Tech for Good)",
        tags: ["Hackathon"],
        bullets: [{ boldText: "Built and pitched", normalText: " a winning project under time pressure." }],
      },
    ],
  },
];

// Skill names are kept identical to project tag strings (PyTorch, Reinforcement
// Learning, Computer Vision, PPO, LSTM, …) so hovering one lights up both.
export const SKILL_GROUPS: SkillGroup[] = [
  { group: "Machine Learning / AI", skills: ["PyTorch", "Reinforcement Learning", "Computer Vision", "PPO", "LSTM"] },
  { group: "Languages", skills: ["Python", "TypeScript", "JavaScript"] },
  { group: "Web", skills: ["React", "Tailwind", "Node"] },
  { group: "Infra / MLOps", skills: ["Docker", "AWS", "Git", "CI/CD"] },
];

export const CV_INTERESTS: string[] = [
  "Chess (peak ELO 2256)",
  "Golf (low single-digit handicap)",
  "Part-time self-proclaimed chef",
];
