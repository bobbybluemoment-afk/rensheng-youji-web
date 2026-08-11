"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { visibleAxisRange } from "../lib/kline";
import type { CardProfile, TimelineRow } from "../lib/types";

const CARD_WIDTH = 1242;
const CARD_HEIGHT = 1660;

function trendValues(rows: TimelineRow[]) {
  return rows.map((_, index) => {
    const slice = rows.slice(Math.max(0, index - 1), Math.min(rows.length, index + 2));
    return slice.reduce((sum, item) => sum + item.average, 0) / slice.length;
  });
}

function KlineChart({ profile }: { profile: CardProfile }) {
  const rows = profile.timeline;
  const [minValue, maxValue] = visibleAxisRange(rows);
  const width = 1040;
  const height = 380;
  const left = 70;
  const right = 18;
  const top = 42;
  const bottom = 60;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (index + 0.5) * (plotWidth / rows.length);
  const y = (value: number) => top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
  const trend = trendValues(rows);
  const ticks: number[] = [];
  for (let value = minValue; value <= maxValue; value += 10) ticks.push(value);

  const bands: Array<{ start: number; end: number; label: string; index: number }> = [];
  rows.forEach((row, index) => {
    const last = bands.at(-1);
    if (!last || last.label !== row.dayun) bands.push({ start: index, end: index, label: row.dayun || "—", index: bands.length });
    else last.end = index;
  });

  const polyline = trend.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  return (
    <svg className="kline-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="未来与过去二十年人生K线">
      {bands.map((band) => {
        const bandX = left + band.start * (plotWidth / rows.length);
        const bandWidth = (band.end - band.start + 1) * (plotWidth / rows.length);
        return (
          <g key={`${band.start}-${band.label}`}>
            <rect x={bandX} y={top} width={bandWidth} height={plotHeight} fill={band.index % 2 ? "#ebe4d7" : "#f4efe5"} opacity="0.72" />
            <text x={bandX + bandWidth / 2} y={25} textAnchor="middle" className="dayun-label">{band.label}运</text>
          </g>
        );
      })}
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="grid-line" />
          <text x={left - 16} y={y(tick) + 6} textAnchor="end" className="axis-label">{tick}</text>
        </g>
      ))}
      <line x1={left} x2={left} y1={top} y2={height - bottom} className="axis-line" />
      <polyline points={polyline} fill="none" className="trend-line" />
      {rows.map((row, index) => {
        const candleX = x(index);
        const current = row.year === profile.centerYear;
        const rising = row.close >= row.open;
        const bodyTop = y(Math.max(row.open, row.close));
        const bodyHeight = Math.max(4, Math.abs(y(row.open) - y(row.close)));
        const color = current ? "#b89552" : rising ? "#c96855" : "#627b6b";
        return (
          <g key={row.year}>
            <line x1={candleX} x2={candleX} y1={y(row.high)} y2={y(row.low)} stroke={color} strokeWidth={current ? 4 : 3} />
            <rect x={candleX - 9} y={bodyTop} width={18} height={bodyHeight} rx="2" fill={rising ? color : "#f4f0e6"} stroke={color} strokeWidth={current ? 4 : 3} />
            {(index % 2 === 0 || current) && (
              <text x={candleX} y={height - 28} textAnchor="middle" className={current ? "year-label current" : "year-label"}>{String(row.year).slice(2)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const LifeCard = forwardRef<HTMLDivElement, { profile: CardProfile }>(function LifeCard({ profile }, ref) {
  const pillars = profile.bazi.pillars;
  return (
    <div className="life-card" ref={ref}>
      <header className="card-header">
        <img src="/logo.png" alt="人生有迹" className="card-logo" />
        <div>
          <div className="brand-name">人生有迹</div>
          <div className="brand-subtitle">找到你的人生主线</div>
        </div>
        <div className="card-version">FREE · LOCAL</div>
      </header>

      <section className="card-section birth-section">
        <h2>出生配置</h2>
        <div className="birth-grid">
          <div className="pillars">
            {pillars.map((pillar, index) => (
              <div className="pillar" key={pillar + index}>
                <span>{["年", "月", "日", "时"][index]}</span>
                <strong>{pillar}</strong>
              </div>
            ))}
          </div>
          <div className="birth-meta">
            {profile.name && <b>{profile.name}</b>}
            <span>{profile.birth} · {profile.birthplace}</span>
            <span>真太阳时 {profile.trueSolarTime.slice(11)}</span>
          </div>
        </div>
      </section>

      <section className="card-section">
        <h2>初始天赋</h2>
        <p className="lead-copy">{profile.talentDescription}</p>
      </section>

      <section className="card-section core-section">
        <h2>核心配置</h2>
        <p className="mystic-copy">{profile.coreMystic}</p>
        {profile.corePlain.map((line) => <p key={line}>{line}</p>)}
      </section>

      <section className="card-section">
        <h2>主线任务</h2>
        <p className="lead-copy">{profile.mainTask}</p>
      </section>

      <section className="card-section kline-section">
        <div className="section-heading-row">
          <h2>人生K线</h2>
          <span>{profile.centerYear - 5}—{profile.centerYear + 14} · {profile.stageLabel}</span>
        </div>
        <KlineChart profile={profile} />
        <div className="legend-row">
          <span><i className="legend-trend" />三年趋势</span>
          <span><i className="legend-wick" />影线＝一年内变化幅度</span>
          <span><i className="legend-current" />当年</span>
        </div>
      </section>

      <section className="card-section issue-section">
        <div className="issue-label">当前课题 · {profile.currentIssue.domain}</div>
        <p className="issue-headline">{profile.currentIssue.headline}</p>
        <p className="issue-example">{profile.currentIssue.example}</p>
      </section>

      <footer className="card-footer">原局定底色 · 大运定环境 · 流年见变化 · 结果仅供自我观察</footer>
    </div>
  );
});

export function ScaledCard({ profile, cardRef }: { profile: CardProfile; cardRef: React.RefObject<HTMLDivElement | null> }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const update = () => setScale(Math.min(1, shell.clientWidth / CARD_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);
  const style = useMemo(() => ({ height: CARD_HEIGHT * scale }), [scale]);
  return (
    <div className="card-shell" ref={shellRef} style={style}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CARD_WIDTH, height: CARD_HEIGHT }}>
        <LifeCard profile={profile} ref={cardRef} />
      </div>
    </div>
  );
}
