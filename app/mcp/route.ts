import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getForecast, publicForecastJson } from "@/lib/forecast";
import type { ForecastPayload } from "@/lib/types";

export const runtime = "nodejs";

/** MCP tools report the verdict as a boolean rather than a "yes"/"no" string. */
function boolCloudyAllDay(cloudyAllDay: ForecastPayload["cloudyAllDay"]) {
  return {
    cloudyAllDay: cloudyAllDay.verdict === "yes",
    summary: cloudyAllDay.summary,
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_west_sf_forecast",
      {
        title: "Get West SF forecast",
        description:
          "Return the full West San Francisco forecast for the target day (today before 6pm PT, tomorrow after): cloudy-all-day verdict, best weather window, high, and hourly conditions. Use when the user wants the whole picture or hourly detail. No arguments.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await getForecast();
        if (!result.ok) {
          return { content: [{ type: "text", text: result.error }], isError: true };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...publicForecastJson(result.data),
                cloudyAllDay: boolCloudyAllDay(result.data.cloudyAllDay),
              }),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_cloudy_all_day_verdict",
      {
        title: "Cloudy all day in West SF?",
        description:
          "Answer whether West San Francisco will be cloudy all day (cloudyAllDay: true or false) plus a one-line summary, for the target day (today before 6pm PT, tomorrow after). Use this for the gray-all-day question. No arguments.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await getForecast();
        if (!result.ok) {
          return { content: [{ type: "text", text: result.error }], isError: true };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                targetDate: result.data.targetDate,
                day: result.data.day,
                ...boolCloudyAllDay(result.data.cloudyAllDay),
              }),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_best_weather_window",
      {
        title: "Best West SF weather window",
        description:
          "Return the best contiguous weather window in West San Francisco (start, end, condition, temp) for the target day (today before 6pm PT, tomorrow after). If the day stays gray, kind is least-bad. Use when asking when to go outside. No arguments.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = await getForecast();
        if (!result.ok) {
          return { content: [{ type: "text", text: result.error }], isError: true };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                targetDate: result.data.targetDate,
                day: result.data.day,
                ...result.data.bestWeather,
              }),
            },
          ],
        };
      },
    );
  },
  {
    serverInfo: {
      name: "west-sf-weather",
      version: "0.1.0",
    },
    instructions:
      "West SF Weather answers whether it will be cloudy all day in West San Francisco and when the best weather window is. Before 6pm PT it covers today; after 6pm it covers tomorrow (see the day field). Location is fixed to West San Francisco. Data is free, public, and cached 1 hour. There is no auth and no payments.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
