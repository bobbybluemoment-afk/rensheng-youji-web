import type { Bazi, CardCopy, PillarDetail } from "./types";

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
const TIME_LINES: Record<string, string> = {
  比肩: "越接近结果，你越希望保留自主决定和独立完成的空间。",
  劫财: "越接近结果，你越会在合作、竞争和他人评价中确认位置。",
  食神: "越接近结果，你越重视过程是否从容，并能形成持续产出。",
  伤官: "越接近结果，你越希望打破限制，用自己的方式完成表达。",
  偏财: "越接近结果，你越关注资源能否流动，并带来更多可能。",
  正财: "越接近结果，你越在意安排是否稳定、具体并能够长期维持。",
  七杀: "越接近结果，你越容易提高要求，希望尽快形成明确成果。",
  正官: "越接近结果，你越在意责任、规则和长期安排是否清楚。",
  偏印: "越接近结果，你越相信独特经验，并倾向保留自己的判断。",
  正印: "越接近结果，你越重视知识、标准和外界认可是否可靠。",
};
const TASK_OPENERS: Record<string, string> = {
  比肩: "依靠自己打开局面时", 劫财: "在合作与竞争中行动时", 食神: "把兴趣变成持续产出时",
  伤官: "打破旧安排寻找新路时", 偏财: "整合人与现实资源时", 正财: "经营稳定生活和资源时",
  七杀: "面对压力推进任务时", 正官: "承担责任建立秩序时", 偏印: "依靠独特经验判断时", 正印: "依靠知识和标准判断时",
};
const TASK_ENDINGS: Record<string, string> = {
  比肩: "让自立成为选择，不必所有事都自己扛", 劫财: "先确认合作边界，不靠比较证明位置",
  食神: "建立稳定节奏，不再等待完美状态", 伤官: "把变化变成选择，不因受限就急着离开",
  偏财: "给机会设定边界，不必什么资源都接住", 正财: "为变化留下余地，不只追求绝对稳定",
  七杀: "给压力设定上限，不再一直逼迫自己", 正官: "保留调整规则的空间，不只证明自己可靠",
  偏印: "让独特经验进入现实，不退回自己的世界", 正印: "把认可当作支撑，不拿它衡量全部价值",
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

export function generateCardCopy(bazi: Bazi): CardCopy {
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

  // 年月决定较稳定的能力来源；时柱作为“现实落点”单独进入第二行与主线任务。
  const foundation = visible.filter((item) => item.position === "year" || item.position === "month");
  const priorities: Record<string, number> = { year: 1, month: 2 };
  const primary = [...foundation].sort((a, b) => b.rootCount - a.rootCount || priorities[b.position] - priorities[a.position])[0];
  const outcomeGod = pillars[3].stem_ten_god;
  const firstLine = `处理问题时，你会${WAYS[primary.tenGod]}，并落实为${OUTCOMES[outcomeGod]}。`;
  const unrootedVisible = visible.filter((item) => item.rootCount === 0);
  const tensionPriorities: Record<string, number> = { year: 1, month: 3, time: 2 };
  const tensionGod = unrootedVisible.length
    ? [...unrootedVisible].sort((a, b) => tensionPriorities[b.position] - tensionPriorities[a.position])[0].tenGod
    : primary.tenGod;
  const mainTask = `${TASK_OPENERS[primary.tenGod]}，${TASK_ENDINGS[outcomeGod]}。`;
  return {
    coreMystic,
    corePlain: [firstLine, TIME_LINES[outcomeGod]],
    mainTask,
    analysisSignature: {
      primaryGod: primary.tenGod,
      primaryPosition: primary.position,
      outcomeGod,
      tensionGod,
      keyRelation: relation,
      taskCode: `${primary.tenGod}-${outcomeGod}`,
    },
  };
}
