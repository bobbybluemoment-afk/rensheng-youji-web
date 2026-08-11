export type Gender = "male" | "female";
export type TimeBasis = "local_civil" | "true_solar_adjusted";

export type PillarDetail = {
  position: "year" | "month" | "day" | "time";
  pillar: string;
  stem: string;
  branch: string;
  stem_ten_god: string;
  hidden_stems: string[];
  hidden_ten_gods: string[];
  five_elements: string;
  growth_stage: string;
};

export type DaYun = {
  pillar: string;
  start_year: number;
  end_year: number;
  start_age: number;
  end_age: number;
};

export type Bazi = {
  pillars: string[];
  day_pillar: string;
  day_master: string;
  analysis_context: {
    month_command: string;
    pillars: PillarDetail[];
    branch_relations: Array<{ relation: string; branches: string; positions: string[] }>;
  };
  luck_direction: string;
  luck_start_local_time: string;
  da_yun: DaYun[];
};

export type TimelineRow = {
  year: number;
  ganzhi: string;
  dayun: string;
  open: number;
  high: number;
  low: number;
  close: number;
  average: number;
  volatility: number;
  change_luck: boolean;
  months: Array<{ ganzhi: string; value: number }>;
};

export type CardProfile = {
  name: string;
  birth: string;
  trueSolarTime: string;
  birthplace: string;
  bazi: Bazi;
  talentDescription: string;
  coreMystic: string;
  corePlain: string[];
  mainTask: string;
  centerYear: number;
  timeline: TimelineRow[];
  stageLabel: string;
  currentIssue: { domain: string; mechanism: string; headline: string; example: string };
  warning?: string;
};

export type AnalysisSignature = {
  primaryGod: string;
  primaryPosition: string;
  outcomeGod: string;
  tensionGod: string;
  keyRelation: string;
  taskCode: string;
};

export type CardCopy = {
  coreMystic: string;
  corePlain: string[];
  mainTask: string;
  analysisSignature: AnalysisSignature;
};
