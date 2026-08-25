import { CACHE_SECONDS, NWS_GRID } from "@/lib/site";

export type NwsPeriod = {
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  name: string;
};

type NwsForecastResponse = {
  properties: {
    updateTime?: string;
    periods: NwsPeriod[];
  };
};

const NWS_HEADERS = {
  "User-Agent": "(west-sf-weather, https://github.com/west-sf-weather)",
  Accept: "application/geo+json",
};

const GRID = `https://api.weather.gov/gridpoints/${NWS_GRID.office}/${NWS_GRID.x},${NWS_GRID.y}`;

async function nwsFetch(url: string): Promise<NwsForecastResponse> {
  const response = await fetch(url, {
    headers: NWS_HEADERS,
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`NWS ${response.status} for ${url}`);
  }

  return (await response.json()) as NwsForecastResponse;
}

export async function fetchHourlyForecast(): Promise<NwsPeriod[]> {
  const data = await nwsFetch(`${GRID}/forecast/hourly`);
  return data.properties.periods ?? [];
}

export async function fetchDailyForecast(): Promise<NwsPeriod[]> {
  const data = await nwsFetch(`${GRID}/forecast`);
  return data.properties.periods ?? [];
}
