import { Solar } from "lunar-javascript";
import type { Bazi, Gender, PillarDetail } from "./types";

const PAIR_RELATIONS: Record<string, string[]> = {
  六合: ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"],
  六冲: ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"],
  六害: ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"],
  六破: ["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"],
};

function samePair(left: string, right: string, candidate: string) {
  return new Set([left, right]).size === new Set(candidate.split("")).size
    && [left, right].every((item) => candidate.includes(item));
}

function branchRelations(branches: string[]) {
  const labels = ["year", "month", "day", "time"];
  const result: Array<{ relation: string; branches: string; positions: string[] }> = [];
  for (let left = 0; left < branches.length; left += 1) {
    for (let right = left + 1; right < branches.length; right += 1) {
      for (const [relation, candidates] of Object.entries(PAIR_RELATIONS)) {
        if (candidates.some((candidate) => samePair(branches[left], branches[right], candidate))) {
          result.push({ relation, branches: branches[left] + branches[right], positions: [labels[left], labels[right]] });
        }
      }
      if (samePair(branches[left], branches[right], "子卯")) {
        result.push({ relation: "相刑", branches: branches[left] + branches[right], positions: [labels[left], labels[right]] });
      }
    }
  }
  const present = new Set(branches);
  for (const [members, name] of [["寅巳申", "寅巳申三刑"], ["丑未戌", "丑未戌三刑"]]) {
    if ([...members].every((item) => present.has(item))) result.push({ relation: "三刑", branches: name.slice(0, 3), positions: [] });
  }
  for (const branch of "辰午酉亥") {
    if (branches.filter((item) => item === branch).length >= 2) {
      result.push({ relation: "自刑", branches: branch.repeat(2), positions: labels.filter((_, i) => branches[i] === branch) });
    }
  }
  return result;
}

export function calculateBazi(value: Date, gender: Gender): Bazi {
  const solar = Solar.fromYmdHms(value.getFullYear(), value.getMonth() + 1, value.getDate(), value.getHours(), value.getMinutes(), 0);
  const lunar = solar.getLunar();
  const eight = lunar.getEightChar();
  const raw = [
    ["year", eight.getYear(), eight.getYearGan(), eight.getYearZhi(), eight.getYearShiShenGan(), eight.getYearHideGan(), eight.getYearShiShenZhi(), eight.getYearWuXing(), eight.getYearDiShi()],
    ["month", eight.getMonth(), eight.getMonthGan(), eight.getMonthZhi(), eight.getMonthShiShenGan(), eight.getMonthHideGan(), eight.getMonthShiShenZhi(), eight.getMonthWuXing(), eight.getMonthDiShi()],
    ["day", eight.getDay(), eight.getDayGan(), eight.getDayZhi(), eight.getDayShiShenGan(), eight.getDayHideGan(), eight.getDayShiShenZhi(), eight.getDayWuXing(), eight.getDayDiShi()],
    ["time", eight.getTime(), eight.getTimeGan(), eight.getTimeZhi(), eight.getTimeShiShenGan(), eight.getTimeHideGan(), eight.getTimeShiShenZhi(), eight.getTimeWuXing(), eight.getTimeDiShi()],
  ];
  const details = raw.map((row) => ({
    position: row[0], pillar: row[1], stem: row[2], branch: row[3], stem_ten_god: row[4],
    hidden_stems: Array.from(row[5] as string[]), hidden_ten_gods: Array.from(row[6] as string[]),
    five_elements: row[7], growth_stage: row[8],
  })) as PillarDetail[];
  const yun = eight.getYun(gender === "male" ? 1 : 0);
  const daYun = yun.getDaYun(10).filter((item: any) => item.getIndex() >= 1).map((item: any) => ({
    pillar: item.getGanZhi(), start_year: item.getStartYear(), end_year: item.getEndYear(),
    start_age: item.getStartAge(), end_age: item.getEndAge(),
  }));
  return {
    pillars: [eight.getYear(), eight.getMonth(), eight.getDay(), eight.getTime()],
    day_pillar: eight.getDay(), day_master: eight.getDayGan(),
    analysis_context: { month_command: eight.getMonthZhi(), pillars: details, branch_relations: branchRelations(details.map((item) => item.branch)) },
    luck_direction: yun.isForward() ? "forward" : "reverse",
    luck_start_local_time: yun.getStartSolar().toYmdHms(),
    da_yun: daYun,
  };
}
