import locationsPayload from "./china_county_locations.json";
import type { TimeBasis } from "./types";

type LocationRecord = { n: string; p: string[]; x: number; z: string };
type CityLocation = { longitude: number; timezone: string; resolvedName: string };

const COUNTRY_PREFIXES = ["中华人民共和国", "中国"];
const SUFFIXES = [
  "维吾尔自治区", "壮族自治区", "回族自治区", "特别行政区", "自治州", "自治县", "自治旗",
  "自治区", "开发区", "管理区", "地区", "林区", "矿区", "新区", "街道", "特区", "省", "市", "县", "区", "旗", "盟",
].sort((a, b) => b.length - a.length);
const records = (locationsPayload as { locations: LocationRecord[] }).locations;
let locationIndex: Map<string, LocationRecord[]> | undefined;

function clean(value: string) {
  let result = value.trim().replace(/[\s,，/\\·、—_-]+/g, "");
  const prefix = COUNTRY_PREFIXES.find((item) => result.startsWith(item));
  if (prefix) result = result.slice(prefix.length);
  return result;
}

function stripSuffix(value: string) {
  const result = clean(value);
  const suffix = SUFFIXES.find((item) => result.endsWith(item) && result.length > item.length);
  return suffix ? result.slice(0, -suffix.length) : result;
}

export function normalizeCity(city: string) {
  return stripSuffix(city);
}

function variants(record: LocationRecord) {
  const parts = record.p.map(clean);
  const short = record.p.map(stripSuffix);
  const values = new Set([clean(record.n), stripSuffix(record.n), parts.join(""), short.join("")]);
  if (parts.length >= 2) {
    values.add(parts.slice(-2).join(""));
    values.add(short.slice(-2).join(""));
    values.add(parts[0] + parts.at(-1));
    values.add(short[0] + short.at(-1));
  }
  return [...values].filter(Boolean) as string[];
}

function getLocationIndex() {
  if (locationIndex) return locationIndex;
  locationIndex = new Map();
  records.forEach((record) => variants(record).forEach((key) => {
    const values = locationIndex!.get(key) ?? [];
    values.push(record);
    locationIndex!.set(key, values);
  }));
  return locationIndex;
}

function describe(record: LocationRecord) {
  return record.p.join("·");
}

function chooseLocation(city: string, candidates: LocationRecord[]) {
  const unique = [...new Map(candidates.map((item) => [`${item.p.join("/")}|${item.x}|${item.z}`, item])).values()];
  if (unique.length === 1) return unique[0];
  const longitudes = unique.map((item) => item.x);
  if (Math.max(...longitudes) - Math.min(...longitudes) <= 0.08) {
    return [...unique].sort((a, b) => b.p.length - a.p.length)[0];
  }
  const choices = unique.slice(0, 6).map(describe).join("、") + (unique.length > 6 ? "等" : "");
  throw new Error(`出生地“${city}”存在重名，请补充省或地级市。可选地点：${choices}。`);
}

export function resolveLocation(city: string, custom?: { longitude?: number; timezone?: string }): CityLocation {
  if (custom?.longitude !== undefined) {
    if (!custom.timezone) throw new Error("海外或自定义地点必须提供 IANA 时区，例如 Asia/Tokyo。");
    return { longitude: custom.longitude, timezone: custom.timezone, resolvedName: city.trim() };
  }
  const index = getLocationIndex();
  const candidates = index.get(clean(city)) ?? index.get(stripSuffix(city));
  if (!candidates?.length) {
    throw new Error("当前地点库尚未匹配到该出生地。中国地点请补充省/市/县区；海外地点请展开高级设置，提供经度和 IANA 时区。");
  }
  const selected = chooseLocation(city, candidates);
  return { longitude: selected.x, timezone: custom?.timezone || selected.z, resolvedName: describe(selected) };
}

export function hasKnownLocation(city: string) {
  if (!city.trim()) return true;
  const index = getLocationIndex();
  return Boolean(index.get(clean(city))?.length || index.get(stripSuffix(city))?.length);
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
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, timeZoneName: "longOffset", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(value);
  } catch {
    throw new Error("timezone 必须是有效的 IANA 时区名称。");
  }
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
  const location = basis === "true_solar_adjusted"
    ? { resolvedName: city.trim(), longitude: 0, timezone: "" }
    : resolveLocation(city, custom);
  if (basis === "true_solar_adjusted") {
    return { date: local, correction: 0, text: birth.replace("T", " "), resolvedName: location.resolvedName };
  }
  const offset = timezoneOffsetHours(local, location.timezone);
  const correction = equationOfTimeMinutes(local) + 4 * location.longitude - 60 * offset;
  const adjusted = new Date(local.getTime() + correction * 60000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: adjusted,
    correction,
    resolvedName: location.resolvedName,
    text: `${adjusted.getFullYear()}-${pad(adjusted.getMonth() + 1)}-${pad(adjusted.getDate())} ${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}`,
    warning: "真太阳时按城市或县区中心经度近似；若接近时辰边界，建议用具体出生地址复核。",
  };
}
