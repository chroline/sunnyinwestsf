import { unstable_cache } from "next/cache";
import { fetchDailyForecast, fetchHourlyForecast } from "@/lib/nws";
import { CACHE_SECONDS, LOCATION, TIMEZONE } from "@/lib/site";
import type { ForecastPayload, ForecastResult, HourPoint } from "@/lib/types";
import {
  bestWeatherWindow,
  cloudyAllDay,
  dayLabel,
  forecastTarget,
  markBestWindow,
  parseNwsStamp,
  hourInLA,
  scoreCondition,
  todayInLA,
} from "@/lib/verdict";

const FORECAST_CACHE_VERSION = "west-sf-forecast-v8";

async function buildForecast(
  targetDate: string,
  cacheHour: number,
): Promise<ForecastPayload> {
  const [hourly, daily] = await Promise.all([
    fetchHourlyForecast(),
    fetchDailyForecast(),
  ]);

  const today = todayInLA();
  const nowHour = cacheHour;
  const day = dayLabel(targetDate);

  const targetHours: HourPoint[] = hourly
    .map((period) => {
      const stamp = parseNwsStamp(period.startTime);
      return {
        time: `${stamp.hour.toString().padStart(2, "0")}:00`,
        iso: period.startTime,
        hour: stamp.hour,
        date: stamp.date,
        condition: period.shortForecast,
        tempF: period.temperature,
        inBestWindow: false,
        score: scoreCondition(period.shortForecast),
      };
    })
    .filter((hour) => hour.date === targetDate);

  if (targetHours.length === 0) {
    throw new Error(`NWS hourly forecast has no periods for ${targetDate}.`);
  }

  const daytime = targetHours.filter((hour) => hour.hour >= 6 && hour.hour <= 18);
  const cloudy = cloudyAllDay(daytime.length > 0 ? daytime : targetHours, day);
  const best = bestWeatherWindow(targetHours);
  const hours = markBestWindow(targetHours, best);

  const targetDaily = daily.find((period) => {
    const stamp = parseNwsStamp(period.startTime);
    return period.isDaytime && stamp.date === targetDate;
  });
  const daytimeTemps = hours
    .filter((hour) => hour.hour >= 6 && hour.hour <= 18)
    .map((hour) => hour.tempF);
  const highF =
    targetDaily?.temperature ??
    (daytimeTemps.length > 0 ? Math.max(...daytimeTemps) : Math.max(...hours.map((h) => h.tempF)));

  const currentPeriod =
    hourly.find((period) => {
      const stamp = parseNwsStamp(period.startTime);
      return stamp.date === today && stamp.hour === nowHour;
    }) ?? hourly[0];

  const currentStamp = parseNwsStamp(currentPeriod.startTime);

  return {
    location: LOCATION,
    timezone: TIMEZONE,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_SECONDS * 1000).toISOString(),
    targetDate,
    day,
    cloudyAllDay: cloudy,
    bestWeather: best,
    highF,
    now: {
      tempF: currentPeriod.temperature,
      condition: currentPeriod.shortForecast,
      hour: currentStamp.hour,
    },
    hours,
  };
}

/**
 * @param dateOverride optional YYYY-MM-DD picked by the user; invalid or
 * missing values fall back to the 6pm today/tomorrow cutover.
 */
export async function getForecast(dateOverride?: string): Promise<ForecastResult> {
  const targetDate =
    dateOverride && /^\d{4}-\d{2}-\d{2}$/.test(dateOverride)
      ? dateOverride
      : forecastTarget().targetDate;
  const cacheHour = hourInLA();
  // Next.js already hashes function args into the cache key. Date + hour are
  // also in keyParts so isolation cannot drift if that default ever changes.
  // "today"/"tomorrow" are not keys — those labels shift with wall-clock.
  const cachedForecast = unstable_cache(
    buildForecast,
    [FORECAST_CACHE_VERSION, targetDate, String(cacheHour)],
    { revalidate: CACHE_SECONDS },
  );
  try {
    const data = await cachedForecast(targetDate, cacheHour);
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forecast unavailable";
    return { ok: false, error: message };
  }
}

export function publicForecastJson(data: ForecastPayload) {
  return {
    location: data.location,
    timezone: data.timezone,
    updatedAt: data.updatedAt,
    expiresAt: data.expiresAt,
    targetDate: data.targetDate,
    day: data.day,
    cloudyAllDay: data.cloudyAllDay,
    bestWeather: {
      start: data.bestWeather.start,
      end: data.bestWeather.end,
      label: data.bestWeather.label,
      condition: data.bestWeather.condition,
      tempF: data.bestWeather.tempF,
      kind: data.bestWeather.kind,
      headline: data.bestWeather.headline,
    },
    highF: data.highF,
    hours: data.hours.map((hour) => ({
      time: hour.time,
      condition: hour.condition,
      tempF: hour.tempF,
      inBestWindow: hour.inBestWindow,
    })),
  };
}
