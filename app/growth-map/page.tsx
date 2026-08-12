"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { generateProfile } from "../lib/engine";
import { hasKnownLocation } from "../lib/solar";
import type { CardProfile, Gender, TimeBasis } from "../lib/types";
import styles from "./growth-map.module.css";

const skillUrl = "https://github.com/bobbybluemoment-afk/rensheng-youji-api/tree/main/skills/rensheng-youji-growth-map";

const focusOptions = [
  ["self_growth", "01｜性格与内在成长", "我为什么总是这样想、这样选择？"],
  ["love_partner", "02｜恋爱与伴侣", "我在爱里如何靠近，又如何退开？"],
  ["career", "03｜事业发展", "什么样的发展方式更适合我？"],
  ["finance_resources", "04｜财务与资源", "我如何获得资源，也如何建立安全感？"],
  ["body_emotion", "05｜身体与情绪", "什么在消耗我，什么能让我恢复？"],
  ["family_growth", "06｜家庭与成长环境", "我在家里承担了什么角色？"],
] as const;

type FormState = {
  name: string; birth: string; birthplace: string; gender: Gender; timeBasis: TimeBasis;
  longitude: string; timezone: string; focus: string; question: string;
  education: string; work: string; relationship: string; family: string; events: string;
};

const initialForm: FormState = {
  name: "", birth: "1990-05-04T13:49", birthplace: "北京", gender: "male",
  timeBasis: "local_civil", longitude: "", timezone: "Asia/Shanghai", focus: "career",
  question: "", education: "", work: "", relationship: "", family: "", events: "",
};

function formatDaYun(profile: CardProfile) {
  return profile.bazi.da_yun.map((item) => `${item.pillar}（${item.start_year}—${item.end_year}）`).join("、");
}

function buildPrompt(form: FormState, profile: CardProfile) {
  const focus = focusOptions.find(([id]) => id === form.focus)?.[1] ?? "全景分析";
  const background = [
    form.education && `学历与学习经历：${form.education}`,
    form.work && `工作与收入状态：${form.work}`,
    form.relationship && `情感关系状态：${form.relationship}`,
    form.family && `家庭与成长背景：${form.family}`,
    form.events && `可核对的重要年份或经历：${form.events}`,
  ].filter(Boolean).join("\n");

  return `请使用 $rensheng-youji-deep-report 为我生成“人生有迹｜成长地图”。

请严格使用下面由网页本地确定性计算得到的排盘资料，不要重新口算四柱或大运：

姓名：${form.name || "未填写"}
身份选项：${form.gender === "male" ? "男" : "女"}
出生地：${profile.birthplace}
输入钟表时间：${profile.birth}
校正后真太阳时：${profile.trueSolarTime}
四柱：${profile.bazi.pillars.join("　")}
日柱：${profile.bazi.day_pillar}
起运时间：${profile.bazi.luck_start_local_time}
大运：${formatDaYun(profile)}
时间提示：${profile.warning || "未发现需要额外提示的时辰边界问题"}

我最想了解：${focus}
我的具体问题：${form.question || "暂未填写，请先做全景分析"}

现实背景：
${background || "暂未补充。请先用四条具体事实判断进行校准，不要假定我的学历、工作、伴侣或家庭情况。"}

请先不要直接生成完整报告。先从家庭、教育、事业组织、情感吸引、财务、迁移、身体情绪和客观年份中，选出准确概率最高、区分度最高的四条现实判断。每条都让我选择：A 很符合、B 部分符合、C 不符合、D 不确定。等我回答后，再生成六维报告、连续阶段分析和旺运指南。`;
}

export default function GrowthMapPage() {
  const [form, setForm] = useState(initialForm);
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const knownCity = hasKnownLocation(form.birthplace);
  const prompt = useMemo(() => profile ? buildPrompt(form, profile) : "", [form, profile]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setCopied(false);
  };

  function prepare() {
    try {
      setError("");
      const next = generateProfile({
        name: form.name, birth: form.birth, birthplace: form.birthplace, gender: form.gender,
        timeBasis: form.timeBasis, longitude: form.longitude ? Number(form.longitude) : undefined,
        timezone: form.timezone || undefined,
      });
      setProfile(next);
      requestAnimationFrame(() => document.querySelector("#growth-result")?.scrollIntoView({ behavior: "smooth" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "资料整理失败，请检查输入。");
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><img src="/logo.png" alt="" /><span>人生有迹 by 景行</span></Link>
        <Link href="/" className={styles.back}>返回免费卡片</Link>
      </header>

      <section className={styles.hero}>
        <div><p className={styles.eyebrow}>人生有迹｜成长地图</p><h1>先核对几件真实发生的事，<br />再展开你的人生全景。</h1><p className={styles.lead}>网页在本地整理出生资料和排盘；本地AI随后给出四条具体事实判断，校准后再生成六维报告、连续阶段分析和旺运指南。</p><div className={styles.pills}><span>不登录</span><span>不用验证码</span><span>资料不上传</span><span>开源免费</span></div></div>
        <img className={styles.heroLogo} src="/logo.png" alt="人生有迹山水Logo" />
      </section>

      <section className={styles.steps}>
        <article><b>01</b><h2>整理资料</h2><p>输入出生资料与愿意提供的现实背景。</p></article>
        <article><b>02</b><h2>事实校准</h2><p>本地AI先给出四条可以确认或否定的判断。</p></article>
        <article><b>03</b><h2>生成报告</h2><p>根据反馈生成成长地图正文，不急着贴标签。</p></article>
      </section>

      <form className={styles.form} onSubmit={(event) => { event.preventDefault(); prepare(); }}>
        <div className={styles.sectionTitle}><span>01</span><div><h2>出生资料</h2><p>姓名可以不填；中国地点通常只需填写常用地名。</p></div></div>
        <div className={styles.grid2}>
          <label>姓名（可选）<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>出生时间<input type="datetime-local" value={form.birth} onChange={(event) => update("birth", event.target.value)} required /></label>
          <label>出生地<input value={form.birthplace} onChange={(event) => update("birthplace", event.target.value)} placeholder="例如：福建泉州惠安县" required /></label>
          <fieldset><legend>身份选项</legend><div className={styles.segmented}><button type="button" className={form.gender === "male" ? styles.active : ""} onClick={() => update("gender", "male")}>男</button><button type="button" className={form.gender === "female" ? styles.active : ""} onClick={() => update("gender", "female")}>女</button></div></fieldset>
        </div>
        <fieldset><legend>时间口径</legend><div className={styles.radios}><label><input type="radio" checked={form.timeBasis === "local_civil"} onChange={() => update("timeBasis", "local_civil")} /><span><b>当地钟表时间</b><small>推荐，网页自动换算真太阳时</small></span></label><label><input type="radio" checked={form.timeBasis === "true_solar_adjusted"} onChange={() => update("timeBasis", "true_solar_adjusted")} /><span><b>已校正真太阳时</b><small>只在你已自行校正时选择</small></span></label></div></fieldset>

        {!knownCity && form.timeBasis === "local_civil" && <div className={styles.advanced}><p>暂未匹配到该地点。中国地点请补充省、市或县区；海外地点可填写：</p><div className={styles.grid2}><label>经度<input type="number" step="0.0001" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} /></label><label>IANA时区<input value={form.timezone} onChange={(event) => update("timezone", event.target.value)} placeholder="Asia/Shanghai" /></label></div></div>}

        <div className={styles.sectionTitle}><span>02</span><div><h2>最想了解什么</h2><p>选一个方向，再写下最近正在发生的具体问题。</p></div></div>
        <div className={styles.focusGrid}>{focusOptions.map(([id, title, question]) => <button type="button" key={id} className={form.focus === id ? styles.focusActive : ""} onClick={() => update("focus", id)}><b>{title}</b><span>{question}</span></button>)}</div>
        <label>具体问题<textarea value={form.question} onChange={(event) => update("question", event.target.value)} placeholder="例如：我应该继续留在现在的单位，还是准备换工作？" /></label>

        <div className={styles.sectionTitle}><span>03</span><div><h2>现实背景（均可不填）</h2><p>信息越具体，AI越能区分不同的现实表现；不知道或不愿填写可以留空。</p></div></div>
        <div className={styles.grid2}>
          <label>学历与学习经历<textarea value={form.education} onChange={(event) => update("education", event.target.value)} placeholder="学历、专业、转专业、考研考证等" /></label>
          <label>工作与收入状态<textarea value={form.work} onChange={(event) => update("work", event.target.value)} placeholder="行业、岗位、单位类型、工作年限等" /></label>
          <label>情感关系状态<textarea value={form.relationship} onChange={(event) => update("relationship", event.target.value)} placeholder="单身、恋爱、已婚，或不想透露" /></label>
          <label>家庭与成长背景<textarea value={form.family} onChange={(event) => update("family", event.target.value)} placeholder="主要照顾者、家庭资源、是否离乡等" /></label>
        </div>
        <label>可核对的重要年份或经历<textarea value={form.events} onChange={(event) => update("events", event.target.value)} placeholder="例如：2020年毕业并搬到上海；2023年换工作" /></label>

        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.primary} type="submit">整理排盘并生成本地AI请求</button>
      </form>

      {profile && <section className={styles.result} id="growth-result">
        <div className={styles.sectionTitle}><span>04</span><div><h2>资料已在浏览器本地整理完成</h2><p>下一步复制请求，交给已安装成长地图Skill的本地AI。</p></div></div>
        <div className={styles.chartSummary}><div><span>真太阳时</span><b>{profile.trueSolarTime}</b></div><div><span>四柱</span><b>{profile.bazi.pillars.join("　")}</b></div><div><span>起运</span><b>{profile.bazi.luck_start_local_time}</b></div></div>
        {profile.warning && <p className={styles.warning}>{profile.warning}</p>}
        <textarea className={styles.prompt} readOnly value={prompt} aria-label="成长地图本地AI请求" />
        <div className={styles.actions}><button onClick={copyPrompt}>{copied ? "已复制" : "复制完整请求"}</button><a href={skillUrl} target="_blank" rel="noreferrer">打开成长地图Skill</a></div>
        <ol className={styles.instructions}><li>先在支持自定义Skill的本地AI中安装成长地图。</li><li>粘贴上面的完整请求。</li><li>先回答四条事实校准，再让AI生成报告正文。</li></ol>
      </section>}

      <section className={styles.contact}>
        <div><p className={styles.eyebrow}>需要更具体的判断</p><h2>复杂选择，可以找景行继续分析。</h2><p>适合进一步讨论生时复核、工作与关系交叉问题、重要年份复盘，以及多个现实选项之间的比较。添加时建议备注“人生有迹”。</p><div className={styles.contactLinks}><a href={skillUrl} target="_blank" rel="noreferrer">GitHub开源Skill</a><Link href="/">免费人生卡片</Link></div></div>
        <figure><img src="/wechat-contact.jpg" alt="景行的工作微信二维码" /><figcaption>微信 · 景行</figcaption></figure>
      </section>
      <footer className={styles.footer}>人生有迹 by 景行 · 传统文化体验与自我观察工具</footer>
    </main>
  );
}
