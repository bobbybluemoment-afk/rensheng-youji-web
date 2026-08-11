import type { Bazi, CardCopy, TimelineRow } from "./types";

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
  比肩: { 城市与生活: 2.4, 家庭关系: 1.1 }, 劫财: { 感情关系: 2.4, 财务安排: 1.2 },
  食神: { 学习发展: 2.4, 感情关系: 1 }, 伤官: { 城市与生活: 2.4, 事业选择: 1.2 },
  偏财: { 财务安排: 2.4, 事业选择: 1 }, 正财: { 财务安排: 2.4, 家庭关系: 1.1 },
  七杀: { 事业选择: 2.4, 家庭关系: 1.2 }, 正官: { 事业选择: 2.2, 感情关系: 1.5 },
  偏印: { 学习发展: 2.4, 城市与生活: 1.2 }, 正印: { 家庭关系: 2.2, 学习发展: 1.8 },
};
const MECHANISM_BY_GOD: Record<string, string> = {
  比肩: "自主边界", 伤官: "自主边界", 劫财: "合作位置", 食神: "能力产出",
  偏财: "资源机会", 正财: "资源机会", 七杀: "责任压力", 正官: "责任压力",
  偏印: "准备判断", 正印: "准备判断",
};
const ISSUE_HEADLINES: Record<string, Record<string, string>> = {
  事业选择: {
    自主边界: "你最近可能在犹豫：继续适应现在的工作，还是去做更适合自己的事？",
    合作位置: "你最近可能更烦的是：合作越来越多，但自己的位置和回报还不清楚？",
    能力产出: "你最近可能在意：做了不少事情，为什么真正被看见的成果还不够？",
    资源机会: "你最近可能在盘算：守住现有收入，还是为新的方向承担一点风险？",
    责任压力: "你最近可能更累的是：责任越来越多，收入或位置却没有一起增加？",
    准备判断: "你最近可能在怀疑：还要继续准备，还是该主动争取一次机会？",
  },
  感情关系: {
    自主边界: "你最近可能在想：这段关系里，自己的需要是不是总被放到后面？",
    合作位置: "你最近可能在意：两个人关系不错，为什么一谈未来就容易反复？",
    能力产出: "你最近可能困惑：明明有感情，为什么重要的话总是说不到一起？",
    资源机会: "你最近可能在权衡：感情要继续，城市、住房和钱该怎么安排？",
    责任压力: "你最近可能有压力：这段关系是不是已经走到必须表态的时候？",
    准备判断: "你最近可能在观察：对方真的适合长期相处，还是只是目前习惯了？",
  },
  财务安排: {
    自主边界: "你最近可能想解决：怎样增加收入，又不把自己困在不喜欢的工作里？",
    合作位置: "你最近可能在意：和别人一起做事，钱和责任到底该怎么分？",
    能力产出: "你最近可能困惑：能力和时间投入不少，为什么还没有稳定变成收入？",
    资源机会: "你最近可能在盘算：该继续存钱，还是拿一部分去尝试新的机会？",
    责任压力: "你最近可能担心：收入看起来还行，为什么现金流仍让人没有安全感？",
    准备判断: "你最近可能在想：还要先提升能力，还是现在就开始增加收入？",
  },
  家庭关系: {
    自主边界: "你最近可能在想：自己的决定，还要不要继续先得到家里同意？",
    合作位置: "你最近可能为难：家里的事总要你协调，但你的需要由谁照顾？",
    能力产出: "你最近可能不知道：怎样把自己的想法说清楚，又不让关系立刻变僵？",
    资源机会: "你最近可能在权衡：要帮家里到什么程度，才不会影响自己的生活？",
    责任压力: "你最近可能觉得累：家里的责任是不是越来越自然地落到你身上？",
    准备判断: "你最近可能在反复确认：按家里的安排走，真的会更稳妥吗？",
  },
  学习发展: {
    自主边界: "你最近可能在犹豫：继续走熟悉的学习路线，还是换一个更想学的方向？",
    合作位置: "你最近可能在意：跟着别人的节奏准备，真的适合自己吗？",
    能力产出: "你最近可能在想：学了不少东西，什么时候才能真正派上用场？",
    资源机会: "你最近可能在权衡：继续投入时间和钱学习，回报是否值得？",
    责任压力: "你最近可能有压力：这次考试、申请或转方向，是不是不能再失败？",
    准备判断: "你最近可能卡在：还要准备到什么程度，才算可以开始行动？",
  },
  城市与生活: {
    自主边界: "你最近可能在想：留在熟悉的地方，还是去更适合自己的城市？",
    合作位置: "你最近可能为难：自己的发展和伴侣、家人的安排很难放在一起？",
    能力产出: "你最近可能不确定：换个环境真的会变好，还是问题仍会跟着自己？",
    资源机会: "你最近可能在权衡：更好的机会，值不值得承担房租和生活成本？",
    责任压力: "你最近可能觉得被催着决定：工作、住房和落脚城市该先定哪一个？",
    准备判断: "你最近可能在等待：是不是再准备充分一点，才适合离开现在的环境？",
  },
};
const ISSUE_ALTERNATES: Record<string, string[]> = {
  "事业选择|责任压力": ["你最近可能在纠结：该继续扛下更多责任，还是先把回报和位置谈清楚？", "你最近可能最不满的是：工作要求不断提高，属于你的机会却没有增加？"],
  "城市与生活|自主边界": ["你最近可能在犹豫：继续留在这里求稳，还是换个城市重新开始？", "你最近可能想弄清楚：不舒服来自这座城市，还是目前的生活方式？"],
  "财务安排|资源机会": ["你最近可能拿不准：手里的钱应该先留作安全感，还是用来争取新机会？", "你最近可能更在意：怎样让收入增加，又不把现有生活变得太冒险？"],
  "学习发展|准备判断": ["你最近可能在想：继续考证或深造，真的比现在开始实践更有用吗？", "你最近可能困惑：是不是总觉得还没准备好，所以一直没有真正开始？"],
  "家庭关系|准备判断": ["你最近可能在问自己：听家里的安排是稳妥，还是只是省去争执？"],
  "感情关系|合作位置": ["你最近可能在想：两个人迟迟谈不拢未来，是时机问题还是目标不同？"],
};
const DOMAIN_STAGE_EXAMPLES: Record<string, Record<string, string>> = {
  事业选择: { 需要决定期: "可能是续约、转岗、离职或新机会同时出现，需要你尽快表态。", 逐渐展开期: "可能是新任务开始增加，但回报和长期位置还没有确定。", 调整安排期: "可能是原来的工作安排越来越难维持，需要重新分配时间和责任。", 成果积累期: "可能是成绩已经出现，但下一步该争取位置、收入还是空间还没想清。", 反复确认期: "可能是日常还能继续，却总觉得成长、收入或意义少了一块。" },
  感情关系: { 需要决定期: "可能是结婚、分开、异地或见家长等问题已经很难继续回避。", 逐渐展开期: "可能是关系正在向前，但双方对未来节奏还没有完全一致。", 调整安排期: "可能是以前默认的相处方式开始失效，需要重新谈清边界和安排。", 成果积累期: "可能是关系已经稳定，下一步反而更需要谈现实生活怎么落地。", 反复确认期: "可能是相处没有大问题，但同一个顾虑一直没有真正解决。" },
  财务安排: { 需要决定期: "可能是换工作、投资、买房或一笔较大支出正在逼近决定。", 逐渐展开期: "可能是收入机会开始增加，但能否持续、该投入多少还不确定。", 调整安排期: "可能是原来的收支方式不再合适，需要重新安排储蓄和现金流。", 成果积累期: "可能是手里的资源开始变多，但怎么分配才能更有效仍没想清。", 反复确认期: "可能是钱没有立刻出问题，却总觉得离真正安心还有距离。" },
  家庭关系: { 需要决定期: "可能是住房、照顾家人或一项家庭决定需要你明确承担多少。", 逐渐展开期: "可能是家庭角色正在变化，别人开始对你提出更多现实期待。", 调整安排期: "可能是原有分工已经让你疲惫，需要重新谈谁负责什么。", 成果积累期: "可能是你已经能照顾很多事，但也开始想为自己留下更多空间。", 反复确认期: "可能是表面相处平稳，同一个边界问题却总在不同事情里出现。" },
  学习发展: { 需要决定期: "可能是考试、申请、转专业或转方向已经到了必须选择的时候。", 逐渐展开期: "可能是新的学习机会出现，但投入后能走到哪里还不确定。", 调整安排期: "可能是原来的准备方式效率下降，需要重新安排时间和重点。", 成果积累期: "可能是能力已经积累不少，下一步更重要的是拿去解决真实问题。", 反复确认期: "可能是一直在准备，却总觉得还差一点才敢真正开始。" },
  城市与生活: { 需要决定期: "可能是工作、租约、伴侣或家人的安排让落脚城市必须尽快确定。", 逐渐展开期: "可能是新的城市或生活方案开始可行，但现实成本还需要计算。", 调整安排期: "可能是现在的通勤、住房或生活节奏已经越来越难维持。", 成果积累期: "可能是生活逐渐稳定后，你反而开始考虑这里是否适合长期留下。", 反复确认期: "可能是眼下没有非走不可，却经常想象换个地方会不会更好。" },
};

function currentIssue(bazi: Bazi, timeline: TimelineRow[], centerYear: number, birthYear: number, copy: CardCopy) {
  const domains = Object.keys(ISSUE_HEADLINES);
  const mechanisms = Object.keys(ISSUE_HEADLINES[domains[0]]);
  const scores: Record<string, number> = Object.fromEntries(domains.map((key) => [key, 0]));
  const mechanismScores: Record<string, number> = Object.fromEntries(mechanisms.map((key) => [key, 0]));
  const add = (god: string, weight: number) => {
    const ranked = Object.entries(DOMAIN_WEIGHTS[god]).sort((a, b) => b[1] - a[1]);
    scores[ranked[0][0]] += weight;
    if (ranked[1]) scores[ranked[1][0]] += weight * 0.42;
    mechanismScores[MECHANISM_BY_GOD[god]] += weight;
  };
  const signature = copy.analysisSignature;
  add(signature.primaryGod, 1.6);
  add(signature.outcomeGod, 1.3);
  add(signature.tensionGod, 0.8);
  const currentLuck = luckFor(bazi, centerYear);
  const luck = currentLuck?.pillar;
  if (luck) { add(tenGod(bazi.day_master, luck[0]), 2.2); add(tenGod(bazi.day_master, HIDDEN[luck[1]][0]), 1.2); }
  [[centerYear - 2, 0.6], [centerYear - 1, 1], [centerYear, 1.5]].forEach(([year, weight]) => {
    const pillar = yearGanzhi(year); add(tenGod(bazi.day_master, pillar[0]), weight); add(tenGod(bazi.day_master, HIDDEN[pillar[1]][0]), weight * 0.45);
  });
  const age = centerYear - birthYear;
  if (age >= 20 && age <= 24) { scores.学习发展 += 0.2; scores.城市与生活 += 0.15; }
  else if (age >= 25 && age <= 29) { scores.事业选择 += 0.2; scores.财务安排 += 0.15; scores.感情关系 += 0.1; }
  else if (age >= 30 && age <= 34) { scores.事业选择 += 0.15; scores.家庭关系 += 0.15; scores.感情关系 += 0.1; }
  else if (age >= 35 && age <= 40) { scores.事业选择 += 0.12; scores.财务安排 += 0.12; scores.家庭关系 += 0.12; }
  const domain = domains.reduce((best, item) => scores[item] > scores[best] ? item : best, domains[0]);
  const mechanism = mechanisms.reduce((best, item) => mechanismScores[item] > mechanismScores[best] ? item : best, mechanisms[0]);
  const index = timeline.findIndex((item) => item.year === centerYear);
  const current = timeline[index], previous = timeline[Math.max(0, index - 1)];
  const delta = current.average - previous.average;
  const stageLabel = current.volatility >= 14 ? "需要决定期" : delta >= 2.5 ? "逐渐展开期" : delta <= -2.5 ? "调整安排期" : current.average >= 62 ? "成果积累期" : "反复确认期";
  const candidates = [ISSUE_HEADLINES[domain][mechanism], ...(ISSUE_ALTERNATES[`${domain}|${mechanism}`] ?? [])];
  const seed = signature.taskCode + stageLabel + (luck ?? "");
  const candidateIndex = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % candidates.length;
  return { stageLabel, issue: { domain, mechanism, headline: candidates[candidateIndex], example: DOMAIN_STAGE_EXAMPLES[domain][stageLabel] } };
}

export function buildKline(bazi: Bazi, birthYear: number, centerYear = new Date().getFullYear(), copy: CardCopy) {
  const timeline = calculateTimeline(bazi, centerYear);
  const current = currentIssue(bazi, timeline, centerYear, birthYear, copy);
  return { centerYear, timelineAlgorithm: "continuity-v3-structured-topic", timeline, stageLabel: current.stageLabel, currentIssue: current.issue };
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
