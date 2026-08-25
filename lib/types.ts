export type CloudyVerdict = "yes" | "no";

/** Which day the forecast answers for: today before 6pm PT, tomorrow after. */
export type ForecastDay = "today" | "tomorrow";

export type SkyScene = "sunny" | "cloudy";

export type BestWeather = {
  start: string;
  end: string;
  startHour: number;
  endHour: number;
  label: string;
  condition: string;
  tempF: number;
  kind: "best" | "least-bad";
  headline: string;
};

export type HourPoint = {
  time: string;
  iso: string;
  hour: number;
  date: string;
  condition: string;
  tempF: number;
  inBestWindow: boolean;
  score: number;
};

export type CloudyAllDay = {
  verdict: CloudyVerdict;
  summary: string;
};

export type ForecastPayload = {
  location: "West San Francisco";
  timezone: "America/Los_Angeles";
  updatedAt: string;
  expiresAt: string;
  targetDate: string;
  /** Human phrase for the target day: "today", "tomorrow", or "on Friday". */
  day: string;
  cloudyAllDay: CloudyAllDay;
  bestWeather: BestWeather;
  highF: number;
  now: {
    tempF: number;
    condition: string;
    hour: number;
  };
  hours: HourPoint[];
};

export type ForecastResult =
  | { ok: true; data: ForecastPayload }
  | { ok: false; error: string };
