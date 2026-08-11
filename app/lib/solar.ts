import type { TimeBasis } from "./types";

type CityLocation = { longitude: number; timezone: string };

const chinaCities: Record<string, number> = {
  北京: 116.4074, 上海: 121.4737, 天津: 117.2008, 重庆: 106.5516,
  广州: 113.2644, 深圳: 114.0579, 杭州: 120.1551, 南京: 118.7969,
  苏州: 120.5853, 武汉: 114.3054, 成都: 104.0665, 西安: 108.9398,
  郑州: 113.6254, 长沙: 112.9388, 合肥: 117.2272, 济南: 117.1201,
  青岛: 120.3826, 厦门: 118.0894, 泉州: 118.6759, 福州: 119.2965,
  南昌: 115.8582, 昆明: 102.8329, 贵阳: 106.6302, 南宁: 108.3669,
  海口: 110.1983, 三亚: 109.5119, 哈尔滨: 126.6424, 长春: 125.3235,
  沈阳: 123.4315, 大连: 121.6147, 石家庄: 114.5149, 太原: 112.5492,
  呼和浩特: 111.7492, 乌鲁木齐: 87.6168, 拉萨: 91.1322, 兰州: 103.8343,
  西宁: 101.7782, 银川: 106.2309,
};

export const CITY_LOCATIONS: Record<string, CityLocation> = Object.fromEntries(
  Object.entries(chinaCities).map(([city, longitude]) => [city, { longitude, timezone: "Asia/Shanghai" }]),
);
Object.assign(CITY_LOCATIONS, {
  香港: { longitude: 114.1694, timezone: "Asia/Hong_Kong" },
  澳门: { longitude: 113.5439, timezone: "Asia/Macau" },
  台北: { longitude: 121.5654, timezone: "Asia/Taipei" },
});

export function normalizeCity(city: string) {
  let value = city.trim();
  for (const suffix of ["特别行政区", "自治州", "地区", "市", "县", "区"]) {
    if (value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }
  return value;
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86400000);
}

function equationOfTimeMinutes(value: Date) {
  const gamma = (2 * Math.PI / 365) * (dayOfYear(value) - 1 + (value.getHours() - 12) / 24);
  return 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
}

function timezoneOffsetHours(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(value);
  const label = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = label.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  return sign * (Number(match[2]) + Number(match[3] ?? 0) / 60);
}

export function adjustBirthTime(
  birth: string,
  city: string,
  basis: TimeBasis,
  custom?: { longitude?: number; timezone?: string },
) {
  const [datePart, timePart] = birth.replace("T", " ").split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const local = new Date(year, month - 1, day, hour, minute, 0);
  if (basis === "true_solar_adjusted") {
    return { date: local, correction: 0, text: birth.replace("T", " ") };
  }
  const known = CITY_LOCATIONS[normalizeCity(city)];
  const longitude = custom?.longitude ?? known?.longitude;
  const timezone = custom?.timezone ?? known?.timezone;
  if (longitude === undefined || !timezone) {
    throw new Error("城市库尚未收录该城市，请展开高级设置并填写经度与IANA时区。")
  }
  const offset = timezoneOffsetHours(local, timezone);
  const correction = equationOfTimeMinutes(local) + 4 * longitude - 60 * offset;
  const adjusted = new Date(local.getTime() + correction * 60000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: adjusted,
    correction,
    text: `${adjusted.getFullYear()}-${pad(adjusted.getMonth() + 1)}-${pad(adjusted.getDate())} ${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}`,
    warning: "真太阳时按城市中心经度近似；若接近时辰边界，建议用具体出生地址复核。",
  };
}
