import type { Bazi, TimelineRow } from "./types";

const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const STEM_ELEMENT: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const STEM_YANG: Record<string, boolean> = { 甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false };
const PRODUCES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const HIDDEN: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"], 辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"], 午: ["丁", "己"], 未: ["己", "丁", "乙"], 申: ["庚", "壬", "戊"], 酉: ["辛"],
  戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};
const CLASHES = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);
const HARMS = new Set(["子未", "未子", "丑午", "午丑", "寅巳", "巳寅", "卯辰", "辰卯", "申亥", "亥申", "酉戌", "戌酉"]);
const COMBINES = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const TRIADS: Array<[Set<string>, string]> = [
  [new Set("申子辰"), "水"], [new Set("亥卯未"), "木"], [new Set("寅午戌"), "火"], [new Set("巳酉丑"), "金"],
];
const STEM_COMBINES = new Set(["甲己", "己甲", "乙庚", "庚乙", "丙辛", "辛丙", "丁壬", "壬丁", "戊癸", "癸戊"]);
const CHANNELS = ["root", "sprout", "flower", "fruit"] as const;
type Channel = typeof CHANNELS[number];
type State = Record<Channel | "pressure", number>;
const NEXT_CHANNEL: Record<Channel, Channel> = { root: "sprout", sprout: "flower", flower: "fruit", fruit: "fruit" };
const GOD_CHANNELS: Record<string, Partial<Record<Channel, number>>> = {
  比肩: { root: 1, sprout: 0.8 }, 劫财: { sprout: 1, flower: 0.6 }, 食神: { sprout: 0.5, flower: 1, fruit: 0.6 },
  伤官: { flower: 1, fruit: 0.6 }, 偏财: { sprout: 0.5, flower: 0.5, fruit: 1 }, 正财: { root: 0.4, fruit: 1 },
  七杀: { sprout: 0.5, flower: 0.6, fruit: 0.4 }, 正官: { root: 0.3, sprout: 0.6, fruit: 0.5 },
  偏印: { root: 1, sprout: 0.6, flower: -0.3 }, 正印: { root: 1, sprout: 0.6 },
};
const PRESSURE_WEIGHT: Record<string, number> = { 比肩: 0.2, 劫财: 0.7, 食神: 0, 伤官: 0.4, 偏财: 0.5, 正财: 0.3, 七杀: 1, 正官: 0.8, 偏印: 0.2, 正印: 0.1 };

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const round1 = (value: number) => Math.round(value * 10) / 10;
const round0 = (value: number) => {
  const base = Math.floor(value);
  if (Math.abs(value - base - 0.5) < 1e-9) return base % 2 === 0 ? base : base + 1;
  return Math.round(value);
};
const addCount = (target: Record<string, number>, key: string, value = 1) => { target[key] = (target[key] ?? 0) + value; };

export function tenGod(dayMaster: string, stem: string) {
  const day = STEM_ELEMENT[dayMaster];
  const other = STEM_ELEMENT[stem];
  const same = STEM_YANG[dayMaster] === STEM_YANG[stem];
  if (other === day) return same ? "比肩" : "劫财";
  if (PRODUCES[day] === other) return same ? "食神" : "伤官";
  if (CONTROLS[day] === other) return same ? "偏财" : "正财";
  if (CONTROLS[other] === day) return same ? "七杀" : "正官";
  return same ? "偏印" : "正印";
}

export function yearGanzhi(year: number) {
  const index = ((year - 4) % 60 + 60) % 60;
  return STEMS[index % 10] + BRANCHES[index % 12];
}

function monthGanzhis(year: number) {
  const tiger: Record<string, string> = { 甲: "丙", 己: "丙", 乙: "戊", 庚: "戊", 丙: "庚", 辛: "庚", 丁: "壬", 壬: "壬", 戊: "甲", 癸: "甲" };
  const start = STEMS.indexOf(tiger[yearGanzhi(year)[0]]);
  return [..."寅卯辰巳午未申酉戌亥子丑"].map((branch, index) => STEMS[(start + index) % 10] + branch);
}

function luckFor(bazi: Bazi, year: number) {
  return bazi.da_yun.find((item) => item.start_year <= year && year <= item.end_year);
}

function completeTriad(branches: string[]) {
  const set = new Set(branches);
  return TRIADS.find(([group]) => [...group].every((item) => set.has(item)))?.[1];
}

function elementRepresentative(element: string, dayMaster: string) {
  const choices = [...STEMS].filter((stem) => STEM_ELEMENT[stem] === element);
  return choices.sort((a, b) => Math.abs(Number(STEM_YANG[b]) - Number(STEM_YANG[dayMaster])) - Math.abs(Number(STEM_YANG[a]) - Number(STEM_YANG[dayMaster])))[0];
}

function relationType(branch: string, other: string) {
  const pair = branch + other;
  if (CLASHES.has(pair)) return "clash";
  if (HARMS.has(pair)) return "harm";
  if (COMBINES.has(pair)) return "combine";
  if (branch === other) return "repeat";
  return undefined;
}

function annualImpact(bazi: Bazi, year: number, effects: Record<string, number>) {
  const dayMaster = bazi.day_master;
  const yearPillar = yearGanzhi(year);
  const luckPillar = luckFor(bazi, year)?.pillar ?? "";
  const sources: Array<[string, number]> = [[yearPillar[0], 1]];
  HIDDEN[yearPillar[1]].forEach((stem, index) => sources.push([stem, [0.62, 0.24, 0.12][index]]));
  if (luckPillar) sources.push([luckPillar[0], 0.42], [HIDDEN[luckPillar[1]][0], 0.24]);
  const raw: Record<Channel, number> = { root: 0, sprout: 0, flower: 0, fruit: 0 };
  let pressure = 0;
  sources.forEach(([stem, sourceWeight]) => {
    const god = tenGod(dayMaster, stem);
    const effect = effects[god];
    Object.entries(GOD_CHANNELS[god]).forEach(([channel, weight]) => { raw[channel as Channel] += effect * weight! * sourceWeight; });
    pressure += PRESSURE_WEIGHT[god] * sourceWeight * (effect <= 0 ? 1 : 0.65);
  });
  const natalStems = bazi.pillars.map((item) => item[0]);
  const natalBranches = bazi.pillars.map((item) => item[1]);
  const relations: Array<[number, string]> = [];
  natalBranches.forEach((branch, index) => { const relation = relationType(yearPillar[1], branch); if (relation) relations.push([index, relation]); });
  if (luckPillar) { const relation = relationType(yearPillar[1], luckPillar[1]); if (relation) relations.push([1, relation]); }
  relations.slice(0, 4).forEach(([index, relation]) => {
    const channel = CHANNELS[Math.min(index, 3)];
    if (relation === "combine") raw[channel] += 0.35;
    else if (relation === "clash") { raw[channel] -= 0.35; raw[NEXT_CHANNEL[channel]] += 0.35; pressure += 0.35; }
    else if (relation === "harm") { raw[channel] -= 0.25; pressure += 0.35; }
    else pressure += 0.2;
  });
  const triad = completeTriad([...natalBranches, yearPillar[1], ...(luckPillar ? [luckPillar[1]] : [])]);
  if (triad) {
    const god = tenGod(dayMaster, elementRepresentative(triad, dayMaster));
    Object.entries(GOD_CHANNELS[god]).forEach(([channel, weight]) => { raw[channel as Channel] += effects[god] * weight! * 0.28; });
  }
  const stemActivation = natalStems.filter((stem) => STEM_COMBINES.has(yearPillar[0] + stem)).length;
  const activation = Math.min(4, relations.length + stemActivation + (triad ? 1 : 0));
  const toInt = (value: number) => value >= 1.25 ? 2 : value >= 0.28 ? 1 : value <= -1.25 ? -2 : value <= -0.28 ? -1 : 0;
  return { year, root: toInt(raw.root), sprout: toInt(raw.sprout), flower: toInt(raw.flower), fruit: toInt(raw.fruit), pressure: clamp(round0(pressure + activation * 0.18), 0, 2), activation };
}

function buildProfile(bazi: Bazi, centerYear: number) {
  const dayMaster = bazi.day_master;
  const visible: Record<string, number> = {};
  const hidden: Record<string, number> = {};
  bazi.pillars.forEach((pillar, index) => {
    if (index !== 2) addCount(visible, pillar[0]);
    HIDDEN[pillar[1]].forEach((stem) => addCount(hidden, stem));
  });
  const rooted: Record<string, number> = {};
  Object.entries(visible).forEach(([stem, count]) => { if (hidden[stem]) rooted[stem] = count; });
  const byGod = (source: Record<string, number>) => {
    const result: Record<string, number> = {};
    Object.entries(source).forEach(([stem, count]) => addCount(result, tenGod(dayMaster, stem), count));
    return result;
  };
  const godVisible = byGod(visible), godHidden = byGod(hidden), godRooted = byGod(rooted);
  const effects: Record<string, number> = {};
  Object.keys(GOD_CHANNELS).forEach((god) => {
    let score = godRooted[god] ? 1 : godVisible[god] ? -1 : (godHidden[god] ?? 0) >= 3 ? 1 : 0;
    if ((godVisible[god] ?? 0) + (godHidden[god] ?? 0) >= 5) score -= 1;
    effects[god] = clamp(score, -2, 2);
  });
  const opening: State = { root: 0.8, sprout: 0.8, flower: 0.8, fruit: 0.6, pressure: 0.8 };
  bazi.pillars.forEach((pillar, index) => {
    const channel = CHANNELS[index];
    const stemGod = index !== 2 ? tenGod(dayMaster, pillar[0]) : "比肩";
    const hiddenGods = HIDDEN[pillar[1]].map((stem) => tenGod(dayMaster, stem));
    opening[channel] += effects[stemGod] * 0.35 + hiddenGods.reduce((sum, god) => sum + effects[god], 0) * 0.1;
    opening.pressure += PRESSURE_WEIGHT[stemGod] * 0.08;
  });
  const openingLuck = luckFor(bazi, centerYear - 6)?.pillar ?? "";
  if (openingLuck) {
    [tenGod(dayMaster, openingLuck[0]), tenGod(dayMaster, HIDDEN[openingLuck[1]][0])].forEach((god) => {
      Object.entries(GOD_CHANNELS[god]).forEach(([channel, weight]) => { opening[channel as Channel] += effects[god] * weight! * 0.18; });
      opening.pressure += PRESSURE_WEIGHT[god] * 0.12;
    });
  }
  CHANNELS.forEach((key) => { opening[key] = round1(clamp(opening[key], -2.5, 3.5)); });
  opening.pressure = round1(clamp(opening.pressure, 0, 3.5));
  const impacts = Array.from({ length: 20 }, (_, index) => annualImpact(bazi, centerYear - 5 + index, effects));
  return { opening, effects, impacts };
}

function nextState(previous: State, impact: ReturnType<typeof annualImpact>): State {
  return {
    root: clamp(previous.root * 0.82 + impact.root * 1.35, -8, 8),
    sprout: clamp(previous.sprout * 0.8 + previous.root * 0.1 + impact.sprout * 1.35, -8, 8),
    flower: clamp(previous.flower * 0.78 + previous.sprout * 0.11 + impact.flower * 1.35, -8, 8),
    fruit: clamp(previous.fruit * 0.74 + previous.flower * 0.12 + impact.fruit * 1.35, -8, 8),
    pressure: clamp(previous.pressure * 0.55 + impact.pressure * 1.2, 0, 8),
  };
}
const stateScore = (state: State) => clamp(50 + state.root * 0.8 + state.sprout + state.flower * 1.2 + state.fruit * 1.5 - state.pressure * 1.6, 15, 85);

function monthEffect(ganzhi: string, dayMaster: string, effects: Record<string, number>) {
  let value = effects[tenGod(dayMaster, ganzhi[0])] * 0.65;
  HIDDEN[ganzhi[1]].forEach((stem, index) => { value += effects[tenGod(dayMaster, stem)] * [0.25, 0.07, 0.03][index]; });
  return value;
}

function relationCount(branch: string, others: string[]) {
  return others.reduce((count, other) => {
    const pair = branch + other;
    return count + (CLASHES.has(pair) ? 2 : 0) + (HARMS.has(pair) || COMBINES.has(pair) ? 1 : 0) + (branch === other ? 1 : 0);
  }, 0);
}

function calculateTimeline(bazi: Bazi, centerYear: number): TimelineRow[] {
  const profile = buildProfile(bazi, centerYear);
  const impactMap = Object.fromEntries(profile.impacts.map((item) => [item.year, item]));
  const natalBranches = bazi.pillars.map((item) => item[1]);
  let state = { ...profile.opening };
  let previousAverage = stateScore(state);
  const result: TimelineRow[] = [];
  for (let year = centerYear - 5; year < centerYear + 15; year += 1) {
    const impact = impactMap[year];
    const target = nextState(state, impact);
    const rawTarget = stateScore(target);
    const boundedTarget = previousAverage + clamp(rawTarget - previousAverage, -10, 10);
    const shift = boundedTarget - rawTarget;
    const yearPillar = yearGanzhi(year);
    const luck = luckFor(bazi, year);
    const luckPillar = luck?.pillar ?? "";
    let values = monthGanzhis(year).map((monthPillar, index) => {
      const progress = (index + 1) / 12;
      const interpolated = Object.fromEntries(Object.keys(state).map((key) => [key, state[key as keyof State] + (target[key as keyof State] - state[key as keyof State]) * progress])) as State;
      const base = stateScore(interpolated) + shift * progress;
      const others = [...natalBranches, yearPillar[1], ...(luckPillar ? [luckPillar[1]] : [])];
      const relations = relationCount(monthPillar[1], others);
      let modifier = monthEffect(monthPillar, bazi.day_master, profile.effects) * 2.2;
      modifier *= 1 + Math.min(relations, 4) * 0.08;
      const triad = completeTriad([...others, monthPillar[1]]);
      if (triad) {
        const stems = [...STEMS].filter((stem) => STEM_ELEMENT[stem] === triad);
        modifier += stems.reduce((sum, stem) => sum + profile.effects[tenGod(bazi.day_master, stem)], 0) / stems.length;
      }
      return clamp(base + clamp(modifier, -6, 6), 15, 85);
    });
    const maxRange = impact.activation >= 4 ? 22 : impact.activation === 3 ? 18 : impact.activation === 2 ? 15 : 12;
    const rawLow = Math.min(...values), rawHigh = Math.max(...values);
    if (rawHigh - rawLow > maxRange) {
      const middle = (rawHigh + rawLow) / 2;
      values = values.map((value) => clamp(value, middle - maxRange / 2, middle + maxRange / 2));
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const previousLuck = luckFor(bazi, year - 1);
    const months = monthGanzhis(year).map((ganzhi, index) => ({ ganzhi, value: round1(values[index]) }));
    result.push({
      year, ganzhi: yearPillar, dayun: luckPillar, open: round0(values[0]), high: round0(Math.max(...values)),
      low: round0(Math.min(...values)), close: round0(values.at(-1)!), average: round1(average),
      volatility: round0(Math.max(...values) - Math.min(...values)), change_luck: Boolean(luck && previousLuck && luck.pillar !== previousLuck.pillar), months,
    });
    state = target;
    previousAverage = average;
  }
  return result;
}

const DOMAIN_WEIGHTS: Record<string, Record<string, number>> = {
  比肩: { 事业选择: 2, 感情关系: 1, 财务安排: 1, 城市与生活: 1 }, 劫财: { 事业选择: 2, 感情关系: 2, 财务安排: 1 },
  食神: { 事业选择: 2, 学习发展: 2, 城市与生活: 1 }, 伤官: { 事业选择: 3, 学习发展: 1, 城市与生活: 2 },
  偏财: { 财务安排: 3, 事业选择: 2, 家庭关系: 1 }, 正财: { 财务安排: 3, 事业选择: 2, 感情关系: 1 },
  七杀: { 事业选择: 3, 感情关系: 1, 家庭关系: 1 }, 正官: { 事业选择: 3, 感情关系: 2, 家庭关系: 1 },
  偏印: { 学习发展: 3, 事业选择: 1, 城市与生活: 1 }, 正印: { 学习发展: 2, 家庭关系: 2, 事业选择: 1 },
};
const ISSUE_COPY: Record<string, { headline: string; example: string }> = {
  事业选择: { headline: "你最近可能在想：现在这份工作还值不值得继续？", example: "可能是事情越做越多，但收入、位置或成长没有一起增加。" },
  感情关系: { headline: "你最近可能在想：这段关系要不要把未来说清楚？", example: "可能是相处没有大问题，但结婚、城市或生活安排一直没谈明白。" },
  财务安排: { headline: "你最近可能更在意：怎样多赚一点，又不影响现有稳定？", example: "例如想增加收入或尝试投资，但又担心存款、现金流或失败成本。" },
  家庭关系: { headline: "你最近可能在想：自己的决定还要不要继续让家里影响？", example: "可能是想按自己的计划生活，又担心拒绝父母会让关系变紧张。" },
  学习发展: { headline: "你最近可能在想：还要继续准备，还是先把能力用起来？", example: "例如想考证、读书或转方向，但担心投入不少，最后仍然用不上。" },
  城市与生活: { headline: "你最近可能在想：要留在这里，还是换个地方生活？", example: "可能是工作、住房和家人各有牵制，很难同时顾到稳定与发展。" },
};

function currentIssue(bazi: Bazi, timeline: TimelineRow[], centerYear: number, birthYear: number) {
  const scores: Record<string, number> = Object.fromEntries(Object.keys(ISSUE_COPY).map((key) => [key, 0]));
  const add = (god: string, weight: number) => Object.entries(DOMAIN_WEIGHTS[god]).forEach(([domain, value]) => { scores[domain] += value * weight; });
  bazi.pillars.forEach((pillar, index) => { if (index !== 2) add(tenGod(bazi.day_master, pillar[0]), 0.55); });
  const luck = luckFor(bazi, centerYear)?.pillar;
  if (luck) { add(tenGod(bazi.day_master, luck[0]), 2); add(tenGod(bazi.day_master, HIDDEN[luck[1]][0]), 1.1); }
  [[centerYear - 2, 0.6], [centerYear - 1, 1], [centerYear, 1.5]].forEach(([year, weight]) => {
    const pillar = yearGanzhi(year); add(tenGod(bazi.day_master, pillar[0]), weight); add(tenGod(bazi.day_master, HIDDEN[pillar[1]][0]), weight * 0.45);
  });
  const age = centerYear - birthYear;
  if (age >= 20 && age <= 24) { scores.学习发展 += 0.8; scores.城市与生活 += 0.7; }
  else if (age >= 25 && age <= 29) { scores.事业选择 += 0.8; scores.财务安排 += 0.5; scores.感情关系 += 0.4; }
  else if (age >= 30 && age <= 34) { scores.事业选择 += 0.6; scores.家庭关系 += 0.5; scores.感情关系 += 0.4; }
  else if (age >= 35 && age <= 40) { scores.事业选择 += 0.5; scores.财务安排 += 0.5; scores.家庭关系 += 0.5; }
  const domains = Object.keys(ISSUE_COPY);
  const domain = domains.reduce((best, item) => scores[item] > scores[best] ? item : best, domains[0]);
  const index = timeline.findIndex((item) => item.year === centerYear);
  const current = timeline[index], previous = timeline[Math.max(0, index - 1)];
  const delta = current.average - previous.average;
  const stageLabel = current.volatility >= 14 ? "需要决定期" : delta >= 2.5 ? "逐渐展开期" : delta <= -2.5 ? "调整安排期" : current.average >= 62 ? "成果积累期" : "反复确认期";
  return { stageLabel, issue: { domain, ...ISSUE_COPY[domain] } };
}

export function buildKline(bazi: Bazi, birthYear: number, centerYear = new Date().getFullYear()) {
  const timeline = calculateTimeline(bazi, centerYear);
  const current = currentIssue(bazi, timeline, centerYear, birthYear);
  return { centerYear, timeline, stageLabel: current.stageLabel, currentIssue: current.issue };
}

export function visibleAxisRange(timeline: TimelineRow[]) {
  const rawMin = Math.min(...timeline.map((item) => item.low));
  const rawMax = Math.max(...timeline.map((item) => item.high));
  let min = Math.max(0, Math.floor((rawMin - 3) / 10) * 10);
  let max = Math.min(100, Math.ceil((rawMax + 3) / 10) * 10);
  if (max - min < 40) {
    const pad = (40 - (max - min)) / 2;
    min = Math.max(0, Math.floor((min - pad) / 10) * 10);
    max = Math.min(100, Math.ceil((max + pad) / 10) * 10);
  }
  return [min, max] as const;
}
