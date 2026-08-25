import { DatePicker } from "@/components/DatePicker";
import type { ForecastPayload } from "@/lib/types";
import { sunnyAnswer } from "@/lib/verdict";

type Props = {
  data: ForecastPayload;
};

/** "2026-08-25" → "Tuesday, August 25". Noon UTC keeps the calendar day stable. */
function formatTargetDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** Keeps white type legible over the bright lower half of a pale sky. */
function Scrim() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_50%_at_50%_50%,rgba(15,23,42,0.32),rgba(15,23,42,0.12)_55%,rgba(15,23,42,0)_78%)]"
    />
  );
}

export function WeatherHud({ data }: Props) {
  const bestPrefix = data.bestWeather.kind === "least-bad" ? "Least bad" : "Best weather";

  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white">
      <Scrim />
      <p className="text-[21px] font-bold tracking-wide drop-shadow">{data.location}</p>
      <DatePicker targetDate={data.targetDate} label={formatTargetDate(data.targetDate)} />
      <p className="mt-14 text-[18px] font-bold text-white/85 drop-shadow">
        Will it be sunny {data.day}?
      </p>
      <h1 className="mt-3 font-serif text-[104px] leading-none tracking-tight italic drop-shadow-lg">
        {sunnyAnswer(data.cloudyAllDay.verdict) === "Yes" ? "Yes!" : "No :("}
      </h1>
      <p className="mt-12 max-w-md text-[20px] font-bold drop-shadow">
        {bestPrefix}: {data.bestWeather.label}
      </p>
      <p className="mt-3 max-w-lg text-[16px] text-white/85 drop-shadow">
        {data.cloudyAllDay.summary}
      </p>
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white/15 px-3 py-1.5 text-[13px] text-white shadow-lg ring-1 ring-white/25 backdrop-blur-xl">
        made with ☕ by{" "}
        <a
          href="https://colegaw.in"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/70"
        >
          Cole Gawin
        </a>{" "}
        in Laurel Heights
      </footer>
    </main>
  );
}

export function ForecastUnavailable({ message }: { message: string }) {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white">
      <Scrim />
      <h1 className="font-serif text-4xl drop-shadow">Forecast unavailable</h1>
      <p className="mt-4 max-w-md text-white/85">{message}</p>
    </main>
  );
}
