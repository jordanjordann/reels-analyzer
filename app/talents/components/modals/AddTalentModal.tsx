"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateTalent } from "@/api/talents/hooks";
import type { AddTalentModalProps } from "../../types";

export function AddTalentModal({}: AddTalentModalProps) {
  const router = useRouter();
  const { mutate: createTalent, isPending } = useCreateTalent();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    instagramUsername: "",
    name: "",
    gender: "",
    notes: "",
  });

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
    }, 150);
  }, [router]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const username = form.instagramUsername.replace(/^@/, "").trim();
    if (!username || !form.name.trim() || !form.gender) {
      setError("Instagram username, name, and gender are required.");
      return;
    }

    createTalent(
      {
        instagramUsername: username,
        name: form.name.trim(),
        gender: form.gender,
        notes: form.notes.trim(),
      },
      {
        onSuccess: () => handleClose(),
        onError: (err) => {
          setError(err.message || "Failed to add talent.");
        },
      },
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${isClosing ? "opacity-0" : "opacity-100"}`}
      onClick={handleClose}
    >
      <div
        className={`relative my-10 w-full max-w-xl transition-transform duration-150 ${isClosing ? "scale-95" : "scale-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.04em]">Add Talent</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
                Instagram Username
              </label>
              <input
                id="username"
                type="text"
                value={form.instagramUsername}
                onChange={(e) => setForm({ ...form, instagramUsername: e.target.value })}
                placeholder="username (without @)"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isPending}
              />
            </div>

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isPending}
              />
            </div>

            <div>
              <label htmlFor="gender" className="mb-1.5 block text-sm font-medium">
                Gender
              </label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isPending}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Scouting notes..."
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isPending}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {isPending ? "Scraping & analyzing..." : "Add & Analyze"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
