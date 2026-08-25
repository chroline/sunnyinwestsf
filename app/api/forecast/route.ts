import { getForecast, publicForecastJson } from "@/lib/forecast";

export const revalidate = 3600;

export async function GET() {
  const result = await getForecast();

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      {
        status: 503,
        headers: {
          "Cache-Control": "public, s-maxage=3600",
        },
      },
    );
  }

  return Response.json(publicForecastJson(result.data), {
    headers: {
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
