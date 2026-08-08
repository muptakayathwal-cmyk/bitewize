import type { CravingId, EffortLevel, Indulgence } from "./types";

export const CRAVINGS: {
  id: CravingId;
  label: string;
  color: string;
  hint: string;
}[] = [
  {
    id: "fresh",
    label: "Fresh",
    color: "#0ACD00",
    hint: "Bright & light",
  },
  {
    id: "savory",
    label: "Savory",
    color: "#60A5FF",
    hint: "Umami comfort",
  },
  {
    id: "spicy",
    label: "Spicy",
    color: "#FF2D00",
    hint: "Heat & kick",
  },
  {
    id: "sweet",
    label: "Sweet",
    color: "#FF60AF",
    hint: "Soft treat",
  },
  {
    id: "comfort",
    label: "Comfort",
    color: "#F1CC00",
    hint: "Warm & cozy",
  },
  {
    id: "crunchy",
    label: "Crunchy",
    color: "#FF8A00",
    hint: "Crisp bite",
  },
];

export const ALLERGY_OPTIONS = [
  "Dairy",
  "Gluten",
  "Nuts",
  "Eggs",
  "Shellfish",
  "Soy",
] as const;

export const TIME_OPTIONS: { label: string; value: number }[] = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hr+", value: 60 },
];

export const EFFORT_OPTIONS: EffortLevel[] = ["Effortless", "Easy", "Medium"];

export const INDULGENCE_OPTIONS: {
  id: Indulgence;
  label: string;
}[] = [
  { id: "healthy", label: "Healthy" },
  { id: "balanced", label: "Balanced" },
  { id: "indulgent", label: "Indulgent" },
];

export function recipeImageUrl(prompt: string, seed: string): string {
  const clean = prompt
    .replace(/[^\w\s,-]/g, "")
    .trim()
    .slice(0, 120);
  const encoded = encodeURIComponent(
    `${clean}, appetizing food photography, plated meal, natural light, shallow depth of field`,
  );
  return `https://image.pollinations.ai/prompt/${encoded}?width=900&height=700&nologo=true&seed=${encodeURIComponent(seed)}`;
}
