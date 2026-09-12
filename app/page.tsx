import type { Metadata } from "next";
import { getForecast } from "@/lib/forecast";
import { forecastJsonLd } from "@/lib/jsonld";
import { ForecastUnavailable, WeatherHud } from "@/components/WeatherHud";
import { SkyCanvas } from "@/components/SkyCanvas";
import { sunnyAnswer } from "@/lib/verdict";
import type { SkyScene } from "@/lib/types";

export const revalidate = 3600;

/** Shown before the canvas hydrates, and to clients without JavaScript. */
const SKY: Record<SkyScene, string> = {
  sunny: "bg-gradient-to-b from-sky-800 via-sky-500 to-sky-300",
  cloudy: "bg-gradient-to-b from-slate-600 via-slate-500 to-slate-400",
};

const RAIN = /rain|shower|drizzle|storm|thunder/i;

async function dateParam(searchParams: PageProps<"/">["searchParams"]): Promise<string | undefined> {
  const { date } = await searchParams;
  return typeof date === "string" ? date : undefined;
}

/**
 * openGraph/twitter merge shallowly with the layout's, so each must carry the
 * full object or the layout's siteName/locale/type would be dropped.
 */
function shareMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "West SF Weather",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function generateMetadata(props: PageProps<"/">): Promise<Metadata> {
  const result = await getForecast(await dateParam(props.searchParams));
  if (!result.ok) {
    return shareMetadata(
      "West SF Weather",
      "Will it be sunny in West San Francisco?",
    );
  }
  const sky = sunnyAnswer(result.data.cloudyAllDay.verdict) === "Yes" ? "Sunny" : "Cloudy";
  return shareMetadata(
    `West SF Weather — ${sky} ${result.data.day}`,
    `${result.data.cloudyAllDay.summary} ${result.data.bestWeather.headline}.`,
  );
}

export default async function Home(props: PageProps<"/">) {
  const result = await getForecast(await dateParam(props.searchParams));

  if (!result.ok) {
    return (
      <div className="relative min-h-dvh">
        <div aria-hidden="true" className={`scene-bg-fade fixed inset-0 ${SKY.cloudy}`} />
        <SkyCanvas scene="cloudy" />
        <ForecastUnavailable message={result.error} />
      </div>
    );
  }

  // The background answers the headline question "Will it be sunny tomorrow?":
  // yes gets a sunny sky, no gets the fog.
  const scene: SkyScene =
    sunnyAnswer(result.data.cloudyAllDay.verdict) === "Yes" ? "sunny" : "cloudy";
  const { condition } = result.data.now;

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden="true" className={`scene-bg-fade fixed inset-0 ${SKY[scene]}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(forecastJsonLd(result.data)) }}
      />
      <SkyCanvas scene={scene} rain={RAIN.test(condition)} />
      <WeatherHud data={result.data} />
    </div>
  );
}
