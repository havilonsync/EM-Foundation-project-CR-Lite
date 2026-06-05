export const RC_LEVELS = ["RC-1", "RC-2", "RC-3", "RC-4", "RC-5"] as const;

export type RelianceLevel = (typeof RC_LEVELS)[number];

export const RC_COLORS: Record<RelianceLevel, string> = {
  "RC-1": "var(--green)",
  "RC-2": "var(--accent)",
  "RC-3": "var(--gold)",
  "RC-4": "#B45309",
  "RC-5": "var(--red)",
};

export const RC_DESCRIPTIONS: Array<{
  level: RelianceLevel;
  threshold: string;
  useCase: string;
}> = [
  {
    level: "RC-1",
    threshold: "No minimum thresholds",
    useCase: "Exploratory inquiry with no reliance on output",
  },
  {
    level: "RC-2",
    threshold: "Aggregate ≥ 0.50, dimensions ≥ 0.40",
    useCase: "Informational use with moderate confidence requirements",
  },
  {
    level: "RC-3",
    threshold: "Aggregate ≥ 0.70, dimensions ≥ 0.60",
    useCase: "Operational decisions; human review recommended",
  },
  {
    level: "RC-4",
    threshold: "Aggregate ≥ 0.85, dimensions ≥ 0.70",
    useCase: "Professional reliance; expert review required on failure",
  },
  {
    level: "RC-5",
    threshold: "Aggregate ≥ 0.90, dimensions ≥ 0.80",
    useCase: "Consequential decisions; highest confidence bar",
  },
];
