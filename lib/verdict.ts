import type {
  BestWeather,
  CloudyAllDay,
  CloudyVerdict,
  ForecastDay,
  HourPoint,
} from "@/lib/types";

/**
 * The product asks "Will it be sunny tomorrow?", which is the inverse of the
 * stored cloudy-all-day verdict: not cloudy all day means yes, some sun.
 */
export function sunnyAnswer(verdict: CloudyVerdict): "Yes" | "No" {
  return verdict === "no" ? "Yes" : "No";
}

export function parseNwsStamp(iso: string): { date: string; hour: number } {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):/);
  if (!match) {
    const fallback = new Date(iso);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
    }).format(fallback);
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(fallback),
    );
    return { date, hour };
  }
  return { date: match[1], hour: Number(match[2]) };
}

export function todayInLA(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(now);
}

export function hourInLA(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

export function tomorrowInLA(now = new Date()): string {
  const today = todayInLA(now);
  const [year, month, day] = today.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/** Until 6pm PT the site answers for today; after that, for tomorrow. */
export const CUTOVER_HOUR = 18;

/** Which day (and calendar date) the forecast should answer for right now. */
export function forecastTarget(now = new Date()): { day: ForecastDay; targetDate: string } {
  const day: ForecastDay = hourInLA(now) >= CUTOVER_HOUR ? "tomorrow" : "today";
  const targetDate = day === "tomorrow" ? tomorrowInLA(now) : todayInLA(now);
  return { day, targetDate };
}

/** "today", "tomorrow", or "on Friday" for dates picked further out. */
export function dayLabel(targetDate: string, now = new Date()): string {
  if (targetDate === todayInLA(now)) return "today";
  if (targetDate === tomorrowInLA(now)) return "tomorrow";
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${targetDate}T12:00:00Z`));
  return `on ${weekday}`;
}

export function scoreCondition(shortForecast: string): number {
  const text = shortForecast.toLowerCase();
  if (/\b(sunny|clear)\b/.test(text) && !/partly|mostly/.test(text)) return 4;
  if (/mostly sunny|mostly clear/.test(text)) return 3;
  if (/partly sunny|partly cloudy/.test(text)) return 2;
  if (/mostly cloudy|broken/.test(text)) return 1;
  if (/haze|fog|overcast|cloudy|stratus|smoke/.test(text)) return 0;
  return 1;
}

export function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 && hour < 24 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}${suffix}`;
}

export function formatWindowLabel(startHour: number, endHour: number): string {
  const startSuffix = startHour >= 12 && startHour < 24 ? "pm" : "am";
  const endSuffix = endHour >= 12 && endHour < 24 ? "pm" : "am";
  const start = startHour % 12 || 12;
  const end = endHour % 12 || 12;
  if (startSuffix === endSuffix) return `${start}–${end}${endSuffix}`;
  return `${start}${startSuffix}–${end}${endSuffix}`;
}

function isSunny(score: number): boolean {
  return score >= 2;
}

export function cloudyAllDay(hours: HourPoint[], day: string = "tomorrow"): CloudyAllDay {
  // Late in the day the 10am-4pm core has already dropped out of the hourly
  // feed, so fall back to whatever daylight remains.
  const core = hours.filter((hour) => hour.hour >= 10 && hour.hour <= 16);
  const gauge = core.length > 0 ? core : hours;
  const anySun = gauge.some((hour) => isSunny(hour.score));
  if (!anySun) {
    return {
      verdict: "yes",
      summary: "Gray all day. No sun expected west of Twin Peaks.",
    };
  }

  const firstSun = hours.find(
    (hour) => hour.hour >= 6 && hour.hour <= 18 && isSunny(hour.score),
  );
  const lastSun = [...hours]
    .reverse()
    .find((hour) => hour.hour >= 6 && hour.hour <= 18 && isSunny(hour.score));

  let summary = `It'll be sunny ${day}.`;
  if (firstSun && lastSun) {
    const window = formatWindowLabel(firstSun.hour, lastSun.hour + 1);
    summary = `It'll be sunny from ${window}.`;
  }

  return { verdict: "no", summary };
}

export function bestWeatherWindow(hours: HourPoint[]): BestWeather {
  const daytime = hours.filter((hour) => hour.hour >= 7 && hour.hour <= 19);
  const pool = daytime.length > 0 ? daytime : hours;
  const maxScore = Math.max(...pool.map((hour) => hour.score));

  let best: HourPoint[] = [];
  let current: HourPoint[] = [];

  const consider = (stretch: HourPoint[]) => {
    if (stretch.length === 0) return;
    if (stretch.length > best.length) {
      best = stretch;
      return;
    }
    if (stretch.length < best.length || best.length === 0) return;
    const avgA =
      stretch.reduce((sum, hour) => sum + hour.tempF, 0) / stretch.length;
    const avgB = best.reduce((sum, hour) => sum + hour.tempF, 0) / best.length;
    if (avgA > avgB) best = stretch;
  };

  for (const hour of pool) {
    if (hour.score === maxScore) {
      current = [...current, hour];
    } else {
      consider(current);
      current = [];
    }
  }
  consider(current);

  const startHour = best[0]?.hour ?? 12;
  const lastHour = best[best.length - 1]?.hour ?? startHour;
  const endHour = Math.min(lastHour + 1, 24);
  const warmest = [...best].sort((a, b) => b.tempF - a.tempF)[0] ?? best[0];
  const label = formatWindowLabel(startHour, endHour);
  const condition = warmest?.condition ?? "Cloudy";
  const tempF = warmest?.tempF ?? 60;
  const kind = maxScore === 0 ? "least-bad" : "best";
  const headline =
    kind === "least-bad"
      ? `Least bad: ${label}, still gray`
      : `Best weather: ${label}, ${condition.toLowerCase()}, ${tempF}°F`;

  return {
    start: `${String(startHour).padStart(2, "0")}:00`,
    end: `${String(endHour).padStart(2, "0")}:00`,
    startHour,
    endHour,
    label,
    condition,
    tempF,
    kind,
    headline,
  };
}

export function markBestWindow(
  hours: HourPoint[],
  window: BestWeather,
): HourPoint[] {
  return hours.map((hour) => ({
    ...hour,
    inBestWindow: hour.hour >= window.startHour && hour.hour < window.endHour,
  }));
}
