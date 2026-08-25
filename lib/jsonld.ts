import { LAT, LON, LOCATION, siteUrl } from "@/lib/site";
import { sunnyAnswer } from "@/lib/verdict";
import type { ForecastPayload } from "@/lib/types";

export function forecastJsonLd(data: ForecastPayload) {
  const url = siteUrl();
  const answer = `${sunnyAnswer(data.cloudyAllDay.verdict)}. ${data.cloudyAllDay.summary} ${data.bestWeather.headline}.`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "West SF Weather",
        url,
        description:
          "Will it be sunny in West San Francisco, and when is the best weather window.",
        applicationCategory: "WeatherApplication",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Sunny-tomorrow verdict for West SF",
          "Best weather window",
          "Hourly NWS forecast",
          "JSON API and MCP tools",
        ],
      },
      {
        "@type": "WeatherForecast",
        name: `West San Francisco forecast for ${data.targetDate}`,
        spatialCoverage: {
          "@type": "Place",
          name: LOCATION,
          geo: {
            "@type": "GeoCoordinates",
            latitude: LAT,
            longitude: LON,
          },
        },
        validFrom: data.updatedAt,
        expires: data.expiresAt,
        abstract: answer,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Will it be sunny in West SF ${data.day}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `${sunnyAnswer(data.cloudyAllDay.verdict)}. ${data.cloudyAllDay.summary}`,
            },
          },
          {
            "@type": "Question",
            name: `When is the best weather in West SF ${data.day}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: data.bestWeather.headline,
            },
          },
        ],
      },
    ],
  };
}
