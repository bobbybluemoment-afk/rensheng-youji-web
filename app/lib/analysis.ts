import type { Bazi, PillarDetail } from "./types";

const STEM_COMBINATIONS: Record<string, string> = {
  甲己: "甲己相合", 乙庚: "乙庚相合", 丙辛: "丙辛相合", 丁壬: "丁壬相合", 戊癸: "戊癸相合",
};
const WAYS: Record<string, string> = {
  正官: "建立规则并协调关系", 七杀: "用专精和执行推进", 正印: "用知识和标准建立可信度",
  偏印: "从边缘经验中提炼方法", 食神: "让兴趣和能力持续产出", 伤官: "跳出安排并寻找新路径",
  正财: "整理资源并建立稳定安排", 偏财: "整合现实资源", 比肩: "依靠自身能力开局", 劫财: "在合作与竞争中行动",
};
const OUTCOMES: Record<string, string> = {
  正官: "可协作的秩序", 七杀: "可以落实的结果", 正印: "容易获得认可的成果", 偏印: "不同于常规的方法",
  食神: "可持续的产出", 伤官: "新的行动路径", 正财: "稳定可用的资源", 偏财: "更广的资源连接",
  比肩: "自主行动的空间", 劫财: "可以共同推进的局面",
};
const TENSION_LINES: Record<string, string> = {
  正官: "当规则或位置不稳定时，你可能会更用力维持正确和可靠。",
  七杀: "当压力缺少实际支撑时，你可能会用更高要求逼迫自己。",
  正印: "当认可不够稳定时，你可能会更努力证明自己值得信任。",
  偏印: "当独特经验得不到理解时，你可能会退回熟悉的小世界。",
  食神: "当余裕不够稳定时，你可能会等到感觉合适才开始行动。",
  伤官: "当行动空间受限时，你可能会把离开当成最快的解决办法。",
  正财: "当稳定资源不足时，你可能会过度在意可控和确定。",
  偏财: "当资源连接不稳定时，你可能会不断扩大关系和机会。",
  比肩: "当自身支撑不够时，你可能会把所有事情都留给自己承担。",
  劫财: "当合作或评价不够稳定时，你可能会更努力地证明自己有用、可靠。",
};
const MAIN_TASKS: Record<string, string> = {
  正官: "在建立规则和承担责任时，也为自己保留调整方向的空间。",
  七杀: "把专精和执行从持续高压，变成能够按需调用的能力。",
  正印: "让知识和认可成为支撑，而不是确认自身价值的唯一来源。",
  偏印: "保留独特判断的同时，也让经验进入真实关系和生活。",
  食神: "让从容和创造成为稳定能力，而不是只能等待合适条件。",
  伤官: "把突破和变化变成主动选择，而不是遇到限制就离开。",
  正财: "在经营稳定生活的同时，也为变化和真实需要留下空间。",
  偏财: "把连接资源、扩大机会的能力，变成有边界且可以选择的工具。",
  比肩: "让自立成为可以选择的能力，而不是凡事只能依靠自己。",
  劫财: "在合作和竞争中确认边界，不再只靠比较证明自己的位置。",
};

function rootCount(stem: string, pillars: PillarDetail[]) {
  return pillars.filter((pillar) => pillar.hidden_stems.includes(stem)).length;
}

function cnJoin(values: string[]) {
  const unique = [...new Set(values)];
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join("、")}与${unique.at(-1)}`;
}

function combinationLabel(left: string, right: string) {
  return STEM_COMBINATIONS[left + right] ?? STEM_COMBINATIONS[right + left];
}

function keyRelation(pillars: PillarDetail[], relations: Bazi["analysis_context"]["branch_relations"]) {
  for (let left = 0; left < pillars.length; left += 1) {
    for (let right = left + 1; right < pillars.length; right += 1) {
      const label = combinationLabel(pillars[left].stem, pillars[right].stem);
      if (label) return label;
    }
  }
  if (!relations.length) return "";
  const relation = relations[0];
  const names: Record<string, string> = { 六合: "相合", 六冲: "相冲", 六害: "相害", 六破: "相破", 相刑: "相刑", 三刑: "成刑", 自刑: "自刑" };
  return `${relation.branches}${names[relation.relation] ?? relation.relation}`;
}

export function generateCardCopy(bazi: Bazi) {
  const pillars = bazi.analysis_context.pillars;
  const visible: Array<{ position: string; stem: string; tenGod: string; rootCount: number }> = [];
  const rooted: string[] = [];
  const unrooted: string[] = [];
  pillars.forEach((pillar, index) => {
    const roots = rootCount(pillar.stem, pillars);
    const label = index === 2 ? "日主" : pillar.stem_ten_god;
    if (roots) rooted.push(label);
    else if (index !== 2) unrooted.push(label);
    if (index !== 2) visible.push({ position: pillar.position, stem: pillar.stem, tenGod: pillar.stem_ten_god, rootCount: roots });
  });
  const relation = keyRelation(pillars, bazi.analysis_context.branch_relations);
  const factParts = [`${visible.map((item) => `${item.stem}${item.tenGod}`).join("、")}透出`];
  if (rooted.length) factParts.push(`${cnJoin(rooted)}有根`);
  if (unrooted.length) factParts.push(`${cnJoin(unrooted)}无根`);
  if (relation) factParts.push(relation);
  const coreMystic = `${factParts[0]}；${factParts.slice(1).join("，")}。`;

  const priorities: Record<string, number> = { year: 3, month: 2, time: 1 };
  const primary = [...visible].sort((a, b) => b.rootCount - a.rootCount || priorities[b.position] - priorities[a.position])[0];
  const outcomeGod = pillars[3].stem_ten_god;
  const pair = `${primary.tenGod}|${outcomeGod}`;
  const firstLine = pair === "偏财|正印"
    ? "你善于整合现实资源，把成果做成能够长期成立、也容易获得认可的东西。"
    : `你善于${WAYS[primary.tenGod]}，并倾向把它转化为${OUTCOMES[outcomeGod]}。`;
  const tension = visible.find((item) => item.rootCount === 0)?.tenGod;
  let secondLine = tension ? TENSION_LINES[tension] : TENSION_LINES[primary.tenGod];
  if (!tension && /冲|刑|害|破/.test(relation)) secondLine = "当不同方向同时拉扯时，你可能会急着找出唯一正确的道路。";
  else if (!tension && relation.includes("合")) secondLine = "当合作成为主要支撑时，你可能会忽略自己真正想保留的部分。";
  const mainTask = pair === "偏财|正印"
    ? "把整合资源、建立秩序的能力，从证明自己变成可以选择的工具。"
    : MAIN_TASKS[primary.tenGod];
  return { coreMystic, corePlain: [firstLine, secondLine], mainTask };
}
