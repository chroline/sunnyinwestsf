import { siteUrl } from "@/lib/site";

export async function GET() {
  const base = siteUrl();
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "West SF Weather",
      version: "0.1.0",
      description:
        "West San Francisco marine-layer forecast: cloudy-all-day verdict, best weather window, and hourly conditions. Cached 1 hour from NWS. Free public data, no authentication.",
    },
    servers: [{ url: base }],
    paths: {
      "/api/forecast": {
        get: {
          operationId: "getWestSfForecast",
          summary: "West SF forecast for the target day",
          description:
            "Returns the cloudy-all-day verdict, best weather window, high temperature, and hourly forecast for West San Francisco. Covers today before 6pm PT and tomorrow after (see the day field).",
          responses: {
            "200": {
              description: "Forecast payload",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Forecast" },
                },
              },
            },
            "503": {
              description: "Upstream NWS forecast unavailable",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Forecast: {
          type: "object",
          required: [
            "location",
            "timezone",
            "updatedAt",
            "expiresAt",
            "cloudyAllDay",
            "bestWeather",
            "highF",
            "hours",
          ],
          properties: {
            location: { type: "string", example: "West San Francisco" },
            timezone: { type: "string", example: "America/Los_Angeles" },
            updatedAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time" },
            targetDate: { type: "string", format: "date" },
            day: { type: "string", enum: ["today", "tomorrow"] },
            cloudyAllDay: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["yes", "no"] },
                summary: { type: "string" },
              },
            },
            bestWeather: {
              type: "object",
              properties: {
                start: { type: "string", example: "14:00" },
                end: { type: "string", example: "16:00" },
                label: { type: "string", example: "2–4pm" },
                condition: { type: "string" },
                tempF: { type: "number" },
                kind: { type: "string", enum: ["best", "least-bad"] },
                headline: { type: "string" },
              },
            },
            highF: { type: "number" },
            hours: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string" },
                  condition: { type: "string" },
                  tempF: { type: "number" },
                  inBestWindow: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
  };

  return Response.json(spec, {
    headers: {
      "Content-Type": "application/openapi+json",
    },
  });
}
