"use client";

import { useState } from "react";
import { ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dissolve } from "@/components/Dissolve";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { todayInLA } from "@/lib/verdict";

type Props = {
  /** The date the forecast answers for, as YYYY-MM-DD. */
  targetDate: string;
  /** Display text for the trigger, e.g. "Tuesday, August 25". */
  label: string;
};

/** "2026-08-25" → a Date at local midnight (avoids the UTC off-by-one). */
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DatePicker({ targetDate, label }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(targetDate);

  // NWS publishes hourly data roughly a week out; anything past that would
  // land on the error page, so the calendar only offers today through +6.
  const first = parseLocalDate(todayInLA());
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded text-[15px] text-white/80 drop-shadow transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          />
        }
      >
        <Dissolve value={targetDate}>
          <span className="inline-block">{label}</span>
        </Dissolve>
        <ViewTransition>
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </ViewTransition>
      </PopoverTrigger>
      <PopoverContent className="w-auto bg-white/15 p-0 text-white shadow-lg ring-white/25 backdrop-blur-xl [--accent-foreground:oklch(1_0_0)] [--accent:oklch(1_0_0_/_0.15)] [--background:transparent] [--foreground:oklch(1_0_0)] [--muted-foreground:oklch(1_0_0_/_0.55)] [--muted:oklch(1_0_0_/_0.2)] [--popover-foreground:oklch(1_0_0)] [--popover:transparent]">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ before: first, after: last }}
          className="bg-transparent text-white"
          onSelect={(date) => {
            if (!date) return;
            setOpen(false);
            router.push(`/?date=${toIsoDate(date)}`);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
