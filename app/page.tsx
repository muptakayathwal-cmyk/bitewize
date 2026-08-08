"use client";

import { useState } from "react";

type Mood = "Happy" | "Sleepy" | "Stressed" | "Chill";

const moods: {
  name: Mood;
  emoji: string;
  drink: string;
  accent: string;
  selected: string;
}[] = [
  {
    name: "Happy",
    emoji: "😊",
    drink: "Iced Latte ☕",
    accent: "hover:border-amber-400 hover:bg-amber-50",
    selected: "border-amber-400 bg-amber-50 ring-2 ring-amber-300",
  },
  {
    name: "Sleepy",
    emoji: "😴",
    drink: "Double Espresso ⚡",
    accent: "hover:border-stone-500 hover:bg-stone-100",
    selected: "border-stone-500 bg-stone-100 ring-2 ring-stone-300",
  },
  {
    name: "Stressed",
    emoji: "😤",
    drink: "Chamomile Tea 🍵",
    accent: "hover:border-lime-500 hover:bg-lime-50",
    selected: "border-lime-500 bg-lime-50 ring-2 ring-lime-300",
  },
  {
    name: "Chill",
    emoji: "😎",
    drink: "Cold Brew 🧊",
    accent: "hover:border-sky-400 hover:bg-sky-50",
    selected: "border-sky-400 bg-sky-50 ring-2 ring-sky-300",
  },
];

export default function Home() {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const recommendation = moods.find((mood) => mood.name === selectedMood);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#f6e7d4_0%,_#efe6dc_45%,_#e8ddd0_100%)] px-4 py-16 font-sans">
      <main className="w-full max-w-3xl text-center">
        <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-[#6b4f3a] uppercase">
          Coffee Mood
        </p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-[#2c1e14] sm:text-5xl md:text-6xl">
          What&apos;s your mood today?
        </h1>
        <p className="mb-10 text-lg text-[#6b5a4d] sm:text-xl">
          Pick a mood and we&apos;ll suggest a drink.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {moods.map((mood) => {
            const isSelected = selectedMood === mood.name;

            return (
              <button
                key={mood.name}
                type="button"
                onClick={() => setSelectedMood(mood.name)}
                className={`group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-[#d9cbbd] bg-white/80 px-6 py-8 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${mood.accent} ${
                  isSelected ? mood.selected : ""
                }`}
              >
                <span className="text-5xl transition-transform duration-300 group-hover:scale-110">
                  {mood.emoji}
                </span>
                <span className="text-xl font-semibold text-[#2c1e14]">
                  {mood.name}
                </span>
              </button>
            );
          })}
        </div>

        {recommendation && (
          <div
            key={recommendation.name}
            className="mt-10 rounded-2xl border border-[#d9cbbd] bg-white/90 px-6 py-8 shadow-md backdrop-blur-sm transition-all duration-300 ease-out"
          >
            <p className="mb-2 text-sm font-medium tracking-wide text-[#6b5a4d] uppercase">
              Your drink
            </p>
            <p className="text-3xl font-bold text-[#2c1e14] sm:text-4xl">
              {recommendation.drink}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
