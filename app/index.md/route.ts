import { getForecast } from "@/lib/forecast";
import { forecastMarkdown } from "@/lib/markdown";

export const revalidate = 3600;

export async function GET() {
  const result = await getForecast();
  return new Response(forecastMarkdown(result), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
