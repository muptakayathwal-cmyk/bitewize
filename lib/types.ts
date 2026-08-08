export type Step = "home" | "results";

export type EffortLevel = "Effortless" | "Easy" | "Medium";
export type DietType = "veg" | "non-veg" | "either";
export type RecipeDiet = "veg" | "vegan" | "non-veg";
export type Indulgence = "healthy" | "balanced" | "indulgent";

export type CuisineId =
  | "indian"
  | "mexican"
  | "american"
  | "italian"
  | "chinese"
  | "thai"
  | "mediterranean"
  | "other";

export type CravingId =
  | "spicy"
  | "sweet"
  | "savory"
  | "comfort"
  | "fresh"
  | "crunchy";

export interface RecipePreferences {
  craving: CravingId | null;
  diet: DietType;
  allergies: string[];
  timeMinutes: number | null;
  effort: EffortLevel | null;
  indulgence: Indulgence;
  surprise?: boolean;
}

export interface RecipeIngredient {
  item: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  cuisine: CuisineId;
  description: string;
  imagePrompt: string;
  imageUrl: string;
  timeMinutes: number;
  effort: EffortLevel;
  diet: RecipeDiet;
  indulgence: Indulgence;
  craving: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  allergens: string[];
  youtubeUrl?: string;
}

export interface RecipesResponse {
  recipes: Recipe[];
  source: "ai" | "fallback";
}
