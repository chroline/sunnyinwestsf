"use client";

import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SCORES: [string, string][] = [
  ["Sunny / Clear", "4"],
  ["Mostly Sunny", "3"],
  ["Partly Sunny / Partly Cloudy", "2"],
  ["Mostly Cloudy", "1"],
  ["Fog, Overcast, Cloudy", "0"],
];

export function MethodologyDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="How this works"
            className="border-0 rounded-xl bg-white/15 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-xl hover:bg-white/25 hover:text-white focus-visible:outline-white/70 aria-expanded:bg-white/25 aria-expanded:text-white"
          />
        }
      >
        <InfoIcon aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="text-left bg-white/15 text-white shadow-lg ring-white/25 backdrop-blur-xl [--accent-foreground:oklch(1_0_0)] [--accent:oklch(1_0_0_/_0.15)] [--background:transparent] [--foreground:oklch(1_0_0)] [--muted-foreground:oklch(1_0_0_/_0.55)] [--muted:oklch(1_0_0_/_0.2)] [--popover-foreground:oklch(1_0_0)] [--popover:transparent] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How this works</DialogTitle>
          <DialogDescription>
            Forecast data comes from the{" "}
            <a
              href="https://forecast.weather.gov/MapClick.php?lat=37.781&lon=-122.479"
              target="_blank"
              rel="noopener noreferrer"
            >
              National Weather Service
            </a>{" "}
            point forecast for the Richmond District, refreshed hourly. Before 6pm
            Pacific the site answers for today; after that, for tomorrow.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">1. Each hour gets a score</p>
          <ul className="mt-1.5 space-y-1">
            {SCORES.map(([label, score]) => (
              <li key={label} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <span className="font-mono text-white/70">{score}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-white/65">
            Rain, drizzle, and anything unlisted score 1 — not sunny.
          </p>

          <p className="mt-4 font-semibold">2. Count the afternoon</p>
          <p className="mt-1.5 text-white/85">
            Only the 10am–4pm window counts. If at least 4 of those 7 hours
            score 2 or better (&ldquo;partly sunny&rdquo; or clearer), the answer is
            yes. Late in the day, once the afternoon has dropped out of the
            feed, the bar shrinks with the hours that remain.
          </p>

          <p className="mt-4 font-semibold">3. Find the best stretch</p>
          <p className="mt-1.5 text-white/85">
            The best-weather window is the longest run of the highest-scoring
            hours between 7am and 7pm. Ties go to the warmer stretch.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}