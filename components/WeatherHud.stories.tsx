import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ForecastPayload } from "@/lib/types";
import { forecastTarget, sunnyAnswer } from "@/lib/verdict";
import { SkyCanvas } from "./SkyCanvas";
import { WeatherHud } from "./WeatherHud";

/**
 * Mock payload with the same 6pm PT cutover as the live site: before 6pm the
 * HUD asks about today, after it asks about tomorrow, with the matching date.
 */
function mockForecast(verdict: "yes" | "no"): ForecastPayload {
  const { day, targetDate } = forecastTarget();
  const sunny = verdict === "no";
  return {
    location: "West San Francisco",
    timezone: "America/Los_Angeles",
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    targetDate,
    day,
    cloudyAllDay: {
      verdict,
      summary: sunny
        ? "It'll be sunny from 10am–6pm."
        : "Gray all day. No sun expected west of Twin Peaks.",
    },
    bestWeather: {
      start: "12:00",
      end: "18:00",
      startHour: 12,
      endHour: 18,
      label: "12–6pm",
      condition: sunny ? "Sunny" : "Cloudy",
      tempF: sunny ? 68 : 58,
      kind: sunny ? "best" : "least-bad",
      headline: sunny
        ? "Best weather: 12–6pm, sunny, 68°F"
        : "Least bad: 12–6pm, still gray",
    },
    highF: sunny ? 68 : 58,
    now: { tempF: sunny ? 64 : 56, condition: sunny ? "Sunny" : "Cloudy", hour: 13 },
    hours: [],
  };
}

const meta = {
  title: "Sky/WeatherHud",
  component: WeatherHud,
  parameters: {
    layout: "fullscreen",
    // The date picker calls useRouter from next/navigation, which needs
    // Storybook's app-router mock mounted.
    nextjs: { appDirectory: true },
  },
  render: (args) => (
    <div className="relative min-h-dvh">
      <SkyCanvas
        scene={sunnyAnswer(args.data.cloudyAllDay.verdict) === "Yes" ? "sunny" : "cloudy"}
      />
      <WeatherHud {...args} />
    </div>
  ),
} satisfies Meta<typeof WeatherHud>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sunny: Story = {
  args: { data: mockForecast("no") },
};

export const Cloudy: Story = {
  args: { data: mockForecast("yes") },
};
