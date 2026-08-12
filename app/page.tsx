"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ScaledCard } from "./components/LifeCard";
import { generateProfile } from "./lib/engine";
import { hasKnownLocation } from "./lib/solar";
import type { CardProfile, Gender, TimeBasis } from "./lib/types";

type FormState = {
  name: string;
  birth: string;
  birthplace: string;
  gender: Gender;
  timeBasis: TimeBasis;
  longitude: string;
  timezone: string;
};

const initialForm: FormState = {
  name: "",
  birth: "1990-05-04T13:49",
  birthplace: "北京",
  gender: "male",
  timeBasis: "local_civil",
  longitude: "",
  timezone: "Asia/Shanghai",
};

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const knownCity = hasKnownLocation(form.birthplace);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  function generate() {
    try {
      setError("");
      const next = generateProfile({
        ...form,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        timezone: form.timezone || undefined,
      });
      setProfile(next);
      requestAnimationFrame(() => document.querySelector("#card-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成失败，请检查出生资料。")
    }
  }

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    setError("");
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 1, width: 1242, height: 1660, backgroundColor: "#f4f0e6" });
      const link = document.createElement("a");
      link.download = `人生有迹-${profile?.bazi.day_pillar ?? "免费卡片"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("图片导出没有完成，请刷新页面后再试一次。")
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">人生有迹 · 免费版</div>
          <h1>先看清你的人生主线，<br />再看这几年怎么走。</h1>
          <p>输入出生资料，生成一张包含人生主线、20年连续K线和当前课题的免费卡片。计算与制图都在你的浏览器里完成。</p>
          <div className="privacy-pill">不登录 · 不用验证码 · 出生资料不上传</div>
          <a className="growth-map-entry" href="/growth-map">体验免费成长地图 →</a>
        </div>
        <div className="hero-mark" aria-hidden="true"><img src="/logo.png" alt="" /></div>
      </section>

      <section className="workspace-grid">
        <form className="input-panel" onSubmit={(event) => { event.preventDefault(); generate(); }}>
          <div className="panel-heading">
            <div><span>01</span><h2>填写出生资料</h2></div>
            <p>姓名可以不填</p>
          </div>

          <label>姓名（可选）<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="用于卡片署名" /></label>
          <label>出生日期与时间<input type="datetime-local" value={form.birth} onChange={(event) => update("birth", event.target.value)} required /></label>
          <label>出生地<input value={form.birthplace} onChange={(event) => update("birthplace", event.target.value)} placeholder="例如：湖北宜昌夷陵区" required /></label>

          <fieldset>
            <legend>性别</legend>
            <div className="segmented">
              <button type="button" className={form.gender === "male" ? "active" : ""} onClick={() => update("gender", "male")}>男</button>
              <button type="button" className={form.gender === "female" ? "active" : ""} onClick={() => update("gender", "female")}>女</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>时间口径</legend>
            <div className="basis-options">
              <label><input type="radio" checked={form.timeBasis === "local_civil"} onChange={() => update("timeBasis", "local_civil")} /><span><b>当地钟表时间</b><small>推荐；系统自动换算真太阳时</small></span></label>
              <label><input type="radio" checked={form.timeBasis === "true_solar_adjusted"} onChange={() => update("timeBasis", "true_solar_adjusted")} /><span><b>已校正真太阳时</b><small>仅在你已自行校正时选择</small></span></label>
            </div>
          </fieldset>

          {!knownCity && form.timeBasis === "local_civil" && (
            <div className="advanced-box">
              <p>暂未匹配到该地点。中国地点请补充省/市/县区；海外地点可填写：</p>
              <label>经度<input type="number" step="0.0001" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="例如 116.4074" /></label>
              <label>IANA 时区<input value={form.timezone} onChange={(event) => update("timezone", event.target.value)} placeholder="例如 Asia/Shanghai" /></label>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          <button className="primary-button" type="submit">生成人生有迹卡片</button>
          <p className="form-note">命理内容用于自我观察，不代替医疗、法律或财务建议。</p>
        </form>

        <aside className="explain-panel">
          <div className="panel-heading"><div><span>02</span><h2>你会看到什么</h2></div></div>
          <ol>
            <li><b>人生主线</b><span>从原局里提炼你反复使用的能力、拉扯与长期任务。</span></li>
            <li><b>人生K线</b><span>把原局、大运和流年放在同一条连续轨迹里，观察20年的起伏。</span></li>
            <li><b>当前课题</b><span>用具体、不过度肯定的表达，指出你此刻最可能面对的现实问题。</span></li>
          </ol>
          <div className="method-card"><span>连续性算法</span><p>人的经历通常不是突然翻转。上一阶段形成的能力、关系与压力，会成为下一阶段的基础或伏笔。</p></div>
        </aside>
      </section>

      {profile && (
        <section className="result-section" id="card-result">
          <div className="result-heading">
            <div><span>03</span><h2>你的免费卡片</h2></div>
            <button onClick={download} disabled={busy}>{busy ? "正在导出…" : "下载高清 PNG"}</button>
          </div>
          <ScaledCard profile={profile} cardRef={cardRef} />
          {profile.warning && <p className="warning-note">{profile.warning}</p>}
        </section>
      )}

      <section className="contact-section" aria-labelledby="contact-title">
        <div className="contact-copy">
          <div className="eyebrow">找到人生有迹</div>
          <h2 id="contact-title">想继续了解，欢迎来找我。</h2>
          <p>想反馈使用体验、了解后续报告，或继续关注“人生有迹”，可以扫码添加微信。添加时建议备注“人生有迹”。</p>
          <a href="https://github.com/bobbybluemoment-afk/rensheng-youji-api" target="_blank" rel="noreferrer">在 GitHub 查看免费版项目</a>
        </div>
        <div className="contact-qr">
          <img src="/wechat-contact.jpg" alt="人生有迹作者景行的微信二维码" />
          <span>微信 · 景行</span>
        </div>
      </section>

      <footer className="site-footer">人生有迹 · 传统文化体验与自我观察工具</footer>
    </main>
  );
}
