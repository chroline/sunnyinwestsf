import type { ForecastResult } from "@/lib/types";
import { formatHourLabel, sunnyAnswer } from "@/lib/verdict";

export function forecastMarkdown(result: ForecastResult): string {
  if (!result.ok) {
    return `# West SF weather\n\n**Status:** Forecast unavailable\n\n${result.error}\n`;
  }

  const { data } = result;
  const hours = data.hours
    .filter((hour) => hour.hour >= 6 && hour.hour <= 22)
    .map((hour) => {
      const best = hour.inBestWindow ? " *(best)*" : "";
      return `- ${formatHourLabel(hour.hour)}: ${hour.condition}, ${hour.tempF}°F${best}`;
    })
    .join("\n");

  return `# West SF weather

West San Francisco marine-layer forecast for **${data.targetDate}** (${data.day}). Cached 1 hour from the National Weather Service San Francisco grid.

**Sunny ${data.day}:** ${sunnyAnswer(data.cloudyAllDay.verdict)}
**Summary:** ${data.cloudyAllDay.summary}
**Window:** ${data.bestWeather.headline}
**High:** ${data.highF}°F
**Now:** ${data.now.condition}, ${data.now.tempF}°F

## Hourly (${data.day})

${hours}

## Machine interfaces

- JSON: /api/forecast
- OpenAPI: /openapi.json
- MCP: /mcp
- This page: /index.md
`;
}
