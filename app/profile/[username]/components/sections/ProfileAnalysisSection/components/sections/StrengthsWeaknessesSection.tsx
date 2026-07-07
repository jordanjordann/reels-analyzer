"use client";

import { StrengthWeaknessColumn } from "./StrengthWeaknessColumn";
import type { StrengthsWeaknessesSectionProps } from "../../types";

export function StrengthsWeaknessesSection({
  strengths,
  weaknesses,
}: StrengthsWeaknessesSectionProps) {
  if (strengths.length === 0 || weaknesses.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StrengthWeaknessColumn
        title="Strengths"
        items={strengths}
        color="text-green-400"
      />
      <StrengthWeaknessColumn
        title="Weaknesses"
        items={weaknesses}
        color="text-red-400"
      />
    </div>
  );
}
