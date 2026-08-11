import roles from "./roles.json";
import { generateCardCopy } from "./analysis";
import { calculateBazi } from "./bazi";
import { buildKline } from "./kline";
import { adjustBirthTime } from "./solar";
import type { CardProfile, Gender, TimeBasis } from "./types";

export type GenerateInput = {
  name?: string;
  birth: string;
  birthplace: string;
  gender: Gender;
  timeBasis: TimeBasis;
  longitude?: number;
  timezone?: string;
};

export function generateProfile(input: GenerateInput): CardProfile {
  if (!input.birth || !input.birthplace.trim()) {
    throw new Error("请先填写出生时间和出生城市。")
  }
  const adjusted = adjustBirthTime(input.birth, input.birthplace, input.timeBasis, {
    longitude: input.longitude,
    timezone: input.timezone,
  });
  const bazi = calculateBazi(adjusted.date, input.gender);
  const copy = generateCardCopy(bazi);
  const kline = buildKline(bazi, adjusted.date.getFullYear(), undefined, copy);
  const talent = (roles as unknown as Record<string, [string, string]>)[bazi.day_pillar]?.[1]
    ?? "你能在长期经历中逐渐找到自己的节奏，并把经验变成可重复使用的能力。";
  const original = input.birth.replace("T", " ");
  return {
    name: input.name?.trim() || "",
    birth: original,
    trueSolarTime: adjusted.text,
    birthplace: adjusted.resolvedName || input.birthplace.trim(),
    bazi,
    talentDescription: talent,
    coreMystic: copy.coreMystic,
    corePlain: copy.corePlain,
    mainTask: copy.mainTask,
    centerYear: kline.centerYear,
    timeline: kline.timeline,
    stageLabel: kline.stageLabel,
    currentIssue: kline.currentIssue,
    warning: adjusted.warning,
  };
}
