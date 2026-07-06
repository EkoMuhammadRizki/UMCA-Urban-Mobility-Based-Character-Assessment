"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getMonthNames, formatMonthYear } from "@/lib/utils/date-utils";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  selectedMonth: number; // 0-indexed
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
}

export function MonthPicker({
  selectedMonth,
  selectedYear,
  onSelect,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const monthNames = getMonthNames();

  // Reset view year when popover opens
  useEffect(() => {
    if (open) {
      setViewYear(selectedYear);
    }
  }, [open, selectedYear]);

  const handleMonthClick = (monthIndex: number) => {
    onSelect(monthIndex, viewYear);
    setOpen(false);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
          className="inline-flex items-center h-10 gap-2 rounded-xl border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary hover:bg-slate-50 shadow-sm cursor-pointer transition-colors"
        >
          <Calendar className="h-4 w-4 text-brand-600" />
          <span>{formatMonthYear(selectedMonth, selectedYear)}</span>
      </PopoverTrigger>

      <PopoverContent
        className="w-[300px] rounded-xl border-border-subtle p-4 shadow-xl"
        align="start"
      >
        {/* Year navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setViewYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-bold text-text-primary">
            {viewYear}
          </span>
          <button
            onClick={() => setViewYear((y) => y + 1)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors"
            aria-label="Tahun berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Month grid (3x4) */}
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((name, idx) => {
            const isSelected =
              idx === selectedMonth && viewYear === selectedYear;
            const isCurrent =
              idx === currentMonth && viewYear === currentYear;
            const isFuture =
              viewYear > currentYear ||
              (viewYear === currentYear && idx > currentMonth);

            return (
              <button
                key={idx}
                onClick={() => handleMonthClick(idx)}
                disabled={isFuture}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isSelected
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
                    : isCurrent
                    ? "bg-brand-100 text-brand-600 font-semibold"
                    : isFuture
                    ? "text-text-muted cursor-not-allowed opacity-50"
                    : "text-text-primary hover:bg-slate-100"
                )}
                aria-label={`${name} ${viewYear}`}
                aria-pressed={isSelected}
              >
                {name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
