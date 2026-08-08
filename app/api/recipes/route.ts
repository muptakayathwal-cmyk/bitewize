import { recipeImageUrl } from "@/lib/options";
import type {
  EffortLevel,
  Indulgence,
  Recipe,
  RecipeDiet,
  RecipePreferences,
  RecipesResponse,
} from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Bitewize, an AI food decision assistant.
Recommend ONLY homemade recipes / cooked meals.
Never suggest restaurants, delivery, supplements, workouts, groceries to buy as products, meal plans, or lifestyle advice.
Return 8 creative, appetizing recipes as strict JSON only.
Vary time, effort, diet, and healthy/indulgent balance so the user can filter.
Each recipe must feel specific and cookable, with realistic quantities and clear steps.
Always include a strong mix of Indian home cooking (wet curries, dry curries / sukhi sabzi, dals, biryanis, tikkas, and stir-fried Indian dishes) alongside international dishes. At least half the recipes should be Indian.
Prioritize vegetarian and vegan options: include dairy-based veg dishes (paneer, ghee tadka) AND fully vegan dishes (oil-based dals, chana, dry sabzi, tofu/tempeh). At least 3 of 8 should be vegan and at least 2 more vegetarian.`;

function buildUserPrompt(prefs: RecipePreferences): string {
  const parts = [
    prefs.surprise
      ? "Surprise the user with a mixed set of delicious recipes across different cravings, with plenty of Indian dishes."
      : null,
    prefs.craving
      ? `Primary craving: ${prefs.craving}. Most recipes should match this craving, with a little variety.`
      : "Offer a mixed set across spicy, sweet, savory, comfort, fresh, and crunchy.",
    prefs.diet === "veg"
      ? "Only vegetarian or vegan recipes (no meat, fish, or eggs)."
      : prefs.diet === "non-veg"
        ? "Include non-vegetarian options; still add 1–2 vegetarian/vegan sides or mains for balance."
        : "Include vegetarian, vegan, and non-vegetarian options.",
    "At least 3 recipes must be vegan (no dairy, ghee, honey, or eggs) and at least 2 more vegetarian.",
    "Include a mix of healthy, balanced, and indulgent recipes.",
    "Include a mix of cooking times from quick to about 45 minutes.",
    "At least 4 of the 8 recipes must be Indian cuisine: wet curries (gravy), dry curries / dry sabzi, dals, or similar Indian skillet dishes.",
    "Use categories like Curry, Dry Curry, Dal, Biryani, Indian Skillet when appropriate.",
  ].filter(Boolean);

  return `Create 8 recipes matching:
${parts.map((p) => `- ${p}`).join("\n")}

Respond with JSON of this exact shape:
{
  "recipes": [
    {
      "id": "kebab-case-id",
      "name": "Recipe Name",
      "category": "short category like Curry / Dry Curry / Dal / Bowl / Pasta",
      "description": "one appetizing sentence",
      "imagePrompt": "short visual description of the plated dish",
      "timeMinutes": 25,
      "effort": "Effortless" | "Easy" | "Medium",
      "diet": "veg" | "vegan" | "non-veg",
      "indulgence": "healthy" | "balanced" | "indulgent",
      "craving": "spicy|sweet|savory|comfort|fresh|crunchy",
      "ingredients": [{ "item": "Tomato", "quantity": "2 medium" }],
      "steps": ["Step one", "Step two"],
      "allergens": ["Dairy"]
    }
  ]
}`;
}

function normalizeRecipe(raw: Partial<Recipe>, index: number): Recipe {
  const id = String(raw.id || `recipe-${index + 1}`);
  const name = String(raw.name || `Recipe ${index + 1}`);
  const imagePrompt = String(
    raw.imagePrompt || `${name}, delicious plated food`,
  );
  const effort = (["Effortless", "Easy", "Medium"].includes(
    String(raw.effort),
  )
    ? raw.effort
    : "Easy") as EffortLevel;
  const indulgence = (["healthy", "balanced", "indulgent"].includes(
    String(raw.indulgence),
  )
    ? raw.indulgence
    : "balanced") as Indulgence;
  const diet =
    raw.diet === "non-veg"
      ? "non-veg"
      : raw.diet === "vegan"
        ? "vegan"
        : "veg";

  return {
    id,
    name,
    category: String(raw.category || "Homemade"),
    description: String(raw.description || "A satisfying homemade meal."),
    imagePrompt,
    imageUrl: recipeImageUrl(imagePrompt, id),
    timeMinutes: Number(raw.timeMinutes) || 25,
    effort,
    diet,
    indulgence,
    craving: String(raw.craving || "savory"),
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map((ing) => ({
          item: String(ing.item || "Ingredient"),
          quantity: String(ing.quantity || "to taste"),
        }))
      : [],
    steps: Array.isArray(raw.steps)
      ? raw.steps.map((s) => String(s))
      : ["Prep ingredients", "Cook until done", "Plate and enjoy"],
    allergens: Array.isArray(raw.allergens)
      ? raw.allergens.map((a) => String(a))
      : [],
  };
}

function fallbackRecipes(prefs: RecipePreferences): Recipe[] {
  const craving = prefs.craving || "comfort";
  const healthyBias = prefs.indulgence === "healthy";
  const vegOnly = prefs.diet === "veg";
  const time = prefs.timeMinutes || 30;

  const pool: Omit<Recipe, "imageUrl">[] = [
    {
      id: "butter-chicken-curry",
      name: "Butter Chicken Curry",
      category: "Curry",
      description: "Silky tomato-butter gravy with tender chicken.",
      imagePrompt: "butter chicken curry in a bowl with cream swirl and naan",
      timeMinutes: Math.min(40, time),
      effort: "Medium",
      diet: "non-veg",
      indulgence: healthyBias ? "balanced" : "indulgent",
      craving: "comfort",
      ingredients: [
        { item: "Chicken thigh", quantity: "400 g" },
        { item: "Tomato puree", quantity: "1 cup" },
        { item: "Butter", quantity: "2 tbsp" },
        { item: "Cream", quantity: "1/3 cup" },
        { item: "Garam masala", quantity: "1 tsp" },
        { item: "Ginger-garlic paste", quantity: "1 tbsp" },
      ],
      steps: [
        "Sear chicken with ginger-garlic paste until lightly browned.",
        "Simmer tomato puree with garam masala and butter until thick.",
        "Add chicken and cook through, then finish with cream.",
        "Serve hot with rice or naan.",
      ],
      allergens: ["Dairy"],
    },
    {
      id: "chana-masala-curry",
      name: "Chana Masala",
      category: "Curry",
      description: "Punchy chickpea curry with tangy tomato masala.",
      imagePrompt: "chana masala chickpea curry with cilantro and lemon",
      timeMinutes: Math.min(30, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "healthy",
      craving: "savory",
      ingredients: [
        { item: "Cooked chickpeas", quantity: "2 cups" },
        { item: "Onion", quantity: "1 large" },
        { item: "Tomato", quantity: "2 medium" },
        { item: "Chana masala spice", quantity: "1.5 tsp" },
        { item: "Cumin seeds", quantity: "1 tsp" },
        { item: "Oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Bloom cumin in oil, then sauté onion until golden.",
        "Add tomato and spices; cook until the oil separates.",
        "Fold in chickpeas with a splash of water and simmer 10 minutes.",
        "Finish with lemon and cilantro.",
      ],
      allergens: [],
    },
    {
      id: "aloo-gobi-dry-curry",
      name: "Aloo Gobi Dry Curry",
      category: "Dry Curry",
      description: "Classic dry potato-cauliflower sabzi with warm spices.",
      imagePrompt: "dry aloo gobi sabzi on a plate with roti",
      timeMinutes: Math.min(30, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "balanced",
      craving: "comfort",
      ingredients: [
        { item: "Potato", quantity: "2 medium" },
        { item: "Cauliflower florets", quantity: "3 cups" },
        { item: "Turmeric", quantity: "1/2 tsp" },
        { item: "Cumin seeds", quantity: "1 tsp" },
        { item: "Coriander powder", quantity: "1 tsp" },
        { item: "Oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Temper cumin in oil and add potatoes with turmeric.",
        "Add cauliflower and coriander; toss on medium heat.",
        "Cover and cook until tender but not mushy, stirring once.",
        "Open-cook for 2 minutes so it stays dry, then serve.",
      ],
      allergens: [],
    },
    {
      id: "bhindi-masala-dry",
      name: "Bhindi Masala (Dry)",
      category: "Dry Curry",
      description: "Crisp okra stir-fried with onion and dry spices.",
      imagePrompt: "dry bhindi masala okra sabzi in a steel kadai",
      timeMinutes: Math.min(25, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "healthy",
      craving: "crunchy",
      ingredients: [
        { item: "Okra (bhindi)", quantity: "400 g" },
        { item: "Onion", quantity: "1 medium" },
        { item: "Amchur", quantity: "1/2 tsp" },
        { item: "Red chili powder", quantity: "1/2 tsp" },
        { item: "Oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Pat okra completely dry and slice into rounds.",
        "Sauté on medium-high until edges crisp and sticky strands fade.",
        "Add onion and spices; cook uncovered until dry and fragrant.",
        "Finish with amchur and serve with dal-rice or roti.",
      ],
      allergens: [],
    },
    {
      id: "palak-paneer-curry",
      name: "Palak Paneer",
      category: "Curry",
      description: "Creamy spinach gravy with soft paneer cubes.",
      imagePrompt: "palak paneer curry with cream and garam masala",
      timeMinutes: Math.min(35, time),
      effort: "Medium",
      diet: "veg",
      indulgence: "balanced",
      craving: "savory",
      ingredients: [
        { item: "Spinach", quantity: "300 g" },
        { item: "Paneer", quantity: "200 g" },
        { item: "Onion", quantity: "1 small" },
        { item: "Garlic", quantity: "3 cloves" },
        { item: "Cream", quantity: "2 tbsp" },
        { item: "Garam masala", quantity: "1/2 tsp" },
      ],
      steps: [
        "Blanch spinach, then blend smooth with a splash of water.",
        "Sauté onion and garlic, pour in spinach puree, and simmer.",
        "Add paneer cubes and cream; warm through gently.",
        "Dust with garam masala and serve with roti or jeera rice.",
      ],
      allergens: ["Dairy"],
    },
    {
      id: "chicken-sukha-dry-curry",
      name: "Chicken Sukha Dry Curry",
      category: "Dry Curry",
      description: "Bold dry-roasted chicken with roasted spice masala.",
      imagePrompt: "dry chicken sukha masala on a plate with onion rings",
      timeMinutes: Math.min(35, time),
      effort: "Medium",
      diet: "non-veg",
      indulgence: "balanced",
      craving: "spicy",
      ingredients: [
        { item: "Chicken", quantity: "500 g" },
        { item: "Onion", quantity: "2 medium" },
        { item: "Ginger-garlic paste", quantity: "1 tbsp" },
        { item: "Kashmiri chili powder", quantity: "1 tsp" },
        { item: "Coriander powder", quantity: "1.5 tsp" },
        { item: "Oil", quantity: "3 tbsp" },
      ],
      steps: [
        "Brown onions deeply, then add ginger-garlic paste.",
        "Add chicken and dry spices; sear on high heat.",
        "Cover briefly, then cook uncovered until the masala clings dry.",
        "Rest 2 minutes and serve with lemon and onion.",
      ],
      allergens: [],
    },
    {
      id: "tomato-dal-tadka",
      name: "Tomato Dal Tadka",
      category: "Dal",
      description: "Soft yellow lentils finished with a sizzling tadka.",
      imagePrompt: "yellow tomato dal tadka in a bowl with steamed rice",
      timeMinutes: Math.min(30, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "healthy",
      craving: "comfort",
      ingredients: [
        { item: "Toor or masoor dal", quantity: "1 cup" },
        { item: "Tomato", quantity: "2 medium" },
        { item: "Turmeric", quantity: "1/2 tsp" },
        { item: "Cumin seeds", quantity: "1 tsp" },
        { item: "Dried red chili", quantity: "1" },
        { item: "Oil", quantity: "1 tbsp" },
      ],
      steps: [
        "Pressure-cook or simmer dal with turmeric until soft.",
        "Mash lightly and fold in chopped tomato.",
        "Temper cumin and chili in oil, pour over the dal.",
        "Serve with rice or roti.",
      ],
      allergens: [],
    },
    {
      id: "paneer-bhurji-skillet",
      name: "Paneer Bhurji",
      category: "Indian Skillet",
      description: "Scrambled paneer with peppers, onion, and kitchen spices.",
      imagePrompt: "paneer bhurji dry scramble in a skillet with roti",
      timeMinutes: Math.min(20, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "balanced",
      craving: "savory",
      ingredients: [
        { item: "Paneer", quantity: "200 g" },
        { item: "Onion", quantity: "1 medium" },
        { item: "Capsicum", quantity: "1/2" },
        { item: "Tomato", quantity: "1" },
        { item: "Turmeric", quantity: "1/4 tsp" },
        { item: "Oil", quantity: "1 tbsp" },
      ],
      steps: [
        "Sauté onion and capsicum until soft-edged.",
        "Add tomato and spices; cook until jammy.",
        "Crumble in paneer and toss until just hot and slightly dry.",
        "Serve with toast, pav, or roti.",
      ],
      allergens: ["Dairy"],
    },
    {
      id: "chili-garlic-noodles",
      name: "Chili Garlic Noodles",
      category: "Noodles",
      description: "Glossy, spicy, and ready before your playlist ends.",
      imagePrompt: "spicy chili garlic noodles in a bowl with chopsticks",
      timeMinutes: Math.min(20, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: healthyBias ? "balanced" : "indulgent",
      craving: "spicy",
      ingredients: [
        { item: "Wheat noodles", quantity: "180 g" },
        { item: "Garlic", quantity: "4 cloves" },
        { item: "Red chili flakes", quantity: "1 tsp" },
        { item: "Soy sauce", quantity: "2 tbsp" },
        { item: "Sesame oil", quantity: "1 tbsp" },
        { item: "Spring onion", quantity: "2 stalks" },
      ],
      steps: [
        "Boil noodles until just tender, then drain.",
        "Warm sesame oil and bloom garlic with chili flakes for 30 seconds.",
        "Toss noodles with soy sauce and the chili-garlic oil.",
        "Finish with spring onion and serve hot.",
      ],
      allergens: ["Gluten", "Soy"],
    },
    {
      id: "kheer-saffron-sweet",
      name: "Saffron Rice Kheer",
      category: "Sweet",
      description: "Slow, milky Indian rice pudding with saffron and cardamom.",
      imagePrompt: "saffron rice kheer in a bowl with pistachios",
      timeMinutes: Math.min(35, time),
      effort: "Easy",
      diet: "veg",
      indulgence: healthyBias ? "balanced" : "indulgent",
      craving: "sweet",
      ingredients: [
        { item: "Basmati rice", quantity: "1/3 cup" },
        { item: "Milk", quantity: "4 cups" },
        { item: "Sugar", quantity: "1/3 cup" },
        { item: "Saffron", quantity: "a pinch" },
        { item: "Cardamom", quantity: "3 pods" },
        { item: "Pistachios", quantity: "2 tbsp" },
      ],
      steps: [
        "Simmer rinsed rice in milk, stirring often, until soft and creamy.",
        "Add sugar, crushed cardamom, and saffron; cook 5 more minutes.",
        "Cool slightly and top with pistachios.",
      ],
      allergens: ["Dairy", "Nuts"],
    },
    {
      id: "lemon-herb-fish",
      name: "Lemon Herb Pan Fish",
      category: "Skillet",
      description: "Bright, light, and done in one pan.",
      imagePrompt: "pan-seared white fish with lemon herbs and greens",
      timeMinutes: Math.min(25, time),
      effort: "Easy",
      diet: "non-veg",
      indulgence: "healthy",
      craving: "fresh",
      ingredients: [
        { item: "White fish fillets", quantity: "2" },
        { item: "Lemon", quantity: "1" },
        { item: "Olive oil", quantity: "1 tbsp" },
        { item: "Garlic", quantity: "2 cloves" },
        { item: "Fresh herbs", quantity: "a handful" },
      ],
      steps: [
        "Pat fish dry and season generously.",
        "Sear in olive oil until golden on both sides.",
        "Add garlic, lemon juice, and herbs for the last minute.",
        "Plate with a simple salad or steamed veg.",
      ],
      allergens: ["Fish"],
    },
    {
      id: "kachumber-fresh-salad",
      name: "Kachumber Salad",
      category: "Salad",
      description: "Crisp cucumber-tomato-onion salad with lemon and cumin.",
      imagePrompt: "indian kachumber salad with cucumber tomato onion cilantro",
      timeMinutes: Math.min(10, time),
      effort: "Effortless",
      diet: "vegan",
      indulgence: "healthy",
      craving: "fresh",
      ingredients: [
        { item: "Cucumber", quantity: "1" },
        { item: "Tomato", quantity: "1" },
        { item: "Onion", quantity: "1/2" },
        { item: "Lemon juice", quantity: "1 tbsp" },
        { item: "Roasted cumin powder", quantity: "1/2 tsp" },
        { item: "Cilantro", quantity: "a handful" },
      ],
      steps: [
        "Dice cucumber, tomato, and onion finely.",
        "Toss with lemon, cumin, salt, and cilantro.",
        "Serve chilled beside curry or as a light plate.",
      ],
      allergens: [],
    },
    {
      id: "rajma-masala-vegan",
      name: "Rajma Masala",
      category: "Curry",
      description: "Hearty kidney-bean curry in a thick onion-tomato gravy.",
      imagePrompt: "rajma masala kidney bean curry with steamed rice",
      timeMinutes: Math.min(40, time),
      effort: "Medium",
      diet: "vegan",
      indulgence: "balanced",
      craving: "comfort",
      ingredients: [
        { item: "Cooked kidney beans", quantity: "2 cups" },
        { item: "Onion", quantity: "1 large" },
        { item: "Tomato puree", quantity: "1 cup" },
        { item: "Ginger-garlic paste", quantity: "1 tbsp" },
        { item: "Rajma masala", quantity: "1.5 tsp" },
        { item: "Oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Sauté onion until deep golden, then add ginger-garlic paste.",
        "Cook tomato puree with spices until oil separates.",
        "Add beans and simmer 12–15 minutes until thick.",
        "Serve with rice.",
      ],
      allergens: [],
    },
    {
      id: "tofu-bhurji-vegan",
      name: "Tofu Bhurji",
      category: "Indian Skillet",
      description: "Vegan scrambled tofu with peppers, onion, and turmeric.",
      imagePrompt: "tofu bhurji scramble with peppers on a plate",
      timeMinutes: Math.min(18, time),
      effort: "Effortless",
      diet: "vegan",
      indulgence: "healthy",
      craving: "savory",
      ingredients: [
        { item: "Firm tofu", quantity: "250 g" },
        { item: "Onion", quantity: "1 medium" },
        { item: "Capsicum", quantity: "1/2" },
        { item: "Tomato", quantity: "1" },
        { item: "Turmeric", quantity: "1/4 tsp" },
        { item: "Oil", quantity: "1 tbsp" },
      ],
      steps: [
        "Crumble tofu and set aside.",
        "Sauté onion and capsicum, then tomato and turmeric.",
        "Add tofu and toss until hot and slightly dry.",
        "Serve with toast or roti.",
      ],
      allergens: ["Soy"],
    },
    {
      id: "ginger-veg-stir-fry",
      name: "Ginger Veg Stir-Fry",
      category: "Skillet",
      description: "Crisp mixed vegetables tossed in a bright ginger sauce.",
      imagePrompt: "colorful vegetable stir fry in a wok",
      timeMinutes: Math.min(20, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "healthy",
      craving: "fresh",
      ingredients: [
        { item: "Mixed vegetables", quantity: "4 cups" },
        { item: "Fresh ginger", quantity: "1 tbsp" },
        { item: "Garlic", quantity: "2 cloves" },
        { item: "Soy sauce", quantity: "1.5 tbsp" },
        { item: "Sesame oil", quantity: "1 tsp" },
        { item: "Neutral oil", quantity: "1 tbsp" },
      ],
      steps: [
        "Stir-fry vegetables on high heat until crisp-tender.",
        "Add ginger and garlic for 30 seconds.",
        "Splash soy and sesame oil; toss and serve.",
      ],
      allergens: ["Soy"],
    },
  ];

  let filtered = pool.filter((r) => {
    if (vegOnly && r.diet === "non-veg") return false;
    if (prefs.allergies.length) {
      const blocked = r.allergens.some((a) =>
        prefs.allergies.some(
          (p) => p.toLowerCase() === a.toLowerCase(),
        ),
      );
      if (blocked) return false;
    }
    if (prefs.timeMinutes && r.timeMinutes > prefs.timeMinutes + 5) {
      return false;
    }
    return true;
  });

  if (filtered.length < 3) filtered = pool.filter((r) => !(vegOnly && r.diet === "non-veg"));

  const preferred = filtered.filter(
    (r) => r.craving === craving || r.indulgence === prefs.indulgence,
  );
  const ordered = [
    ...preferred,
    ...filtered.filter((r) => !preferred.includes(r)),
  ].slice(0, 8);

  return ordered.map((r) => ({
    ...r,
    imageUrl: recipeImageUrl(r.imagePrompt, r.id),
  }));
}

async function generateWithOpenAI(
  prefs: RecipePreferences,
): Promise<Recipe[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(prefs) },
      ],
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error", await response.text());
    return null;
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { recipes?: Partial<Recipe>[] };
    if (!Array.isArray(parsed.recipes) || parsed.recipes.length === 0) {
      return null;
    }
    return parsed.recipes.slice(0, 8).map(normalizeRecipe);
  } catch (error) {
    console.error("Failed to parse OpenAI recipes", error);
    return null;
  }
}

const MEALDB_QUERIES: Record<string, string[]> = {
  spicy: ["curry", "vindaloo", "masala", "chili"],
  sweet: ["kheer", "gulab", "chocolate", "pancake"],
  savory: ["biryani", "paneer", "mushroom", "rice"],
  comfort: ["dal", "korma", "stew", "soup"],
  fresh: ["salad", "vegetable", "salmon"],
  crunchy: ["potato", "samosa", "chicken", "toast"],
  surprise: ["curry", "biryani", "vegetarian", "fish", "tofu"],
};

const INDIAN_MEALDB_QUERIES = [
  "curry",
  "masala",
  "biryani",
  "dal",
  "paneer",
  "tikka",
  "korma",
  "vindaloo",
];

type MealDbMeal = {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string | null;
  [key: string]: string | null | undefined;
};

function mealDbDiet(meal: MealDbMeal): RecipeDiet {
  const category = (meal.strCategory || "").toLowerCase();
  const tags = (meal.strTags || "").toLowerCase();
  const blob =
    `${meal.strMeal} ${meal.strCategory} ${meal.strTags || ""} ${meal.strArea || ""}`.toLowerCase();
  const ingredients = mealDbIngredients(meal)
    .map((i) => i.item)
    .join(" ")
    .toLowerCase();
  const all = `${blob} ${ingredients}`;

  if (
    /chicken|beef|pork|lamb|mutton|fish|seafood|prawn|shrimp|bacon|turkey|duck|goat/.test(
      all,
    )
  ) {
    return "non-veg";
  }

  const hasAnimalDairyOrEgg =
    /paneer|ghee|butter|cream|cheese|yogurt|yoghurt|milk|\begg\b|honey/.test(
      all,
    );

  if (category.includes("vegan") || tags.includes("vegan")) {
    return "vegan";
  }

  if (
    category.includes("vegetarian") ||
    /dal|chana|aloo|gobi|bhindi|palak|sambar|rasam|khichdi|tofu|tempeh|vegetable/.test(
      blob,
    ) ||
    category.includes("starter") ||
    category.includes("side") ||
    category.includes("dessert") ||
    category.includes("vegan")
  ) {
    if (!hasAnimalDairyOrEgg) return "vegan";
    return "veg";
  }

  return "non-veg";
}

function mealDbIngredients(meal: MealDbMeal): { item: string; quantity: string }[] {
  const items: { item: string; quantity: string }[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const item = meal[`strIngredient${i}`]?.trim();
    const quantity = meal[`strMeasure${i}`]?.trim() || "to taste";
    if (item) items.push({ item, quantity });
  }
  return items;
}

function mealDbSteps(instructions?: string): string[] {
  if (!instructions) return ["Cook according to taste and serve warm."];
  return instructions
    .split(/\r?\n|\. /)
    .map((s) => s.replace(/^\d+[\).\s-]*/, "").trim())
    .filter((s) => s.length > 8)
    .slice(0, 8);
}

function mealToRecipe(meal: MealDbMeal, prefs: RecipePreferences): Recipe {
  const diet = mealDbDiet(meal);
  const effort: EffortLevel =
    prefs.effort ||
    (prefs.timeMinutes && prefs.timeMinutes <= 20 ? "Effortless" : "Easy");
  const timeMinutes = Math.min(
    prefs.timeMinutes || 35,
    prefs.timeMinutes ? prefs.timeMinutes : 35,
  );
  const name = meal.strMeal.toLowerCase();
  const isIndian = (meal.strArea || "").toLowerCase() === "indian";
  let category = meal.strCategory || meal.strArea || "Homemade";
  if (isIndian) {
    if (/biryani|pulao|pilaf/.test(name)) category = "Biryani";
    else if (/dal|dhal|sambar/.test(name)) category = "Dal";
    else if (/dry|sukha|bhaji|sabzi|fry/.test(name)) category = "Dry Curry";
    else if (/curry|masala|korma|vindaloo|tikka|makhani|butter/.test(name))
      category = "Curry";
    else category = meal.strCategory || "Indian";
  }

  return {
    id: `mealdb-${meal.idMeal}`,
    name: meal.strMeal,
    category,
    description: isIndian
      ? `An Indian home-style ${prefs.craving || "comfort"} pick ready for your table.`
      : `A satisfying ${prefs.craving || "homemade"} pick from classic kitchen inspiration.`,
    imagePrompt: meal.strMeal,
    imageUrl:
      meal.strMealThumb ||
      recipeImageUrl(meal.strMeal, meal.idMeal),
    timeMinutes,
    effort,
    diet,
    indulgence: prefs.indulgence,
    craving: prefs.craving || "savory",
    ingredients: mealDbIngredients(meal),
    steps: mealDbSteps(meal.strInstructions),
    allergens: inferAllergens(mealDbIngredients(meal).map((i) => i.item)),
  };
}

function inferAllergens(ingredients: string[]): string[] {
  const text = ingredients.join(" ").toLowerCase();
  const found: string[] = [];
  if (/milk|cream|butter|cheese|yogurt|ghee/.test(text)) found.push("Dairy");
  if (/wheat|flour|bread|pasta|noodle/.test(text)) found.push("Gluten");
  if (/peanut|almond|cashew|walnut|nut/.test(text)) found.push("Nuts");
  if (/\begg\b|eggs/.test(text)) found.push("Eggs");
  if (/shrimp|prawn|crab|lobster|shellfish/.test(text)) found.push("Shellfish");
  if (/soy|tofu|tempeh/.test(text)) found.push("Soy");
  return found;
}

async function lookupMeal(id: string): Promise<MealDbMeal | null> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { meals?: MealDbMeal[] | null };
    return data.meals?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchIndianMeals(): Promise<MealDbMeal[]> {
  const collected: MealDbMeal[] = [];

  try {
    const filterRes = await fetch(
      "https://www.themealdb.com/api/json/v1/1/filter.php?a=Indian",
    );
    if (filterRes.ok) {
      const data = (await filterRes.json()) as {
        meals?: { idMeal: string }[] | null;
      };
      const ids = (data.meals || [])
        .map((m) => m.idMeal)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      const detailed = await Promise.all(ids.map((id) => lookupMeal(id)));
      for (const meal of detailed) {
        if (meal) collected.push(meal);
      }
    }
  } catch (error) {
    console.error("MealDB Indian filter failed", error);
  }

  for (const query of INDIAN_MEALDB_QUERIES) {
    try {
      const searchRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
      );
      if (!searchRes.ok) continue;
      const data = (await searchRes.json()) as { meals?: MealDbMeal[] | null };
      if (data.meals?.length) collected.push(...data.meals);
    } catch (error) {
      console.error("MealDB Indian search failed", error);
    }
  }

  return collected;
}

async function fetchVegetarianMeals(): Promise<MealDbMeal[]> {
  const collected: MealDbMeal[] = [];
  try {
    const filterRes = await fetch(
      "https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian",
    );
    if (filterRes.ok) {
      const data = (await filterRes.json()) as {
        meals?: { idMeal: string }[] | null;
      };
      const ids = (data.meals || [])
        .map((m) => m.idMeal)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);
      const detailed = await Promise.all(ids.map((id) => lookupMeal(id)));
      for (const meal of detailed) {
        if (meal) collected.push(meal);
      }
    }
  } catch (error) {
    console.error("MealDB Vegetarian filter failed", error);
  }

  for (const query of ["tofu", "vegetable", "lentil", "chickpea", "dal"]) {
    try {
      const searchRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
      );
      if (!searchRes.ok) continue;
      const data = (await searchRes.json()) as { meals?: MealDbMeal[] | null };
      if (data.meals?.length) collected.push(...data.meals);
    } catch (error) {
      console.error("MealDB veg search failed", error);
    }
  }

  return collected;
}

async function generateWithMealDb(
  prefs: RecipePreferences,
): Promise<Recipe[] | null> {
  const queries = prefs.surprise
    ? [
        ...MEALDB_QUERIES.surprise,
        ...MEALDB_QUERIES.spicy,
        ...MEALDB_QUERIES.comfort,
        ...MEALDB_QUERIES.fresh,
      ]
    : [
        ...(MEALDB_QUERIES[prefs.craving || "comfort"] || MEALDB_QUERIES.comfort),
        ...MEALDB_QUERIES.savory,
      ];

  const collected: MealDbMeal[] = [];

  const [indianMeals, vegetarianMeals] = await Promise.all([
    fetchIndianMeals(),
    fetchVegetarianMeals(),
  ]);
  collected.push(...indianMeals, ...vegetarianMeals);

  for (const query of queries) {
    try {
      const searchRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
      );
      if (!searchRes.ok) continue;
      const data = (await searchRes.json()) as { meals?: MealDbMeal[] | null };
      if (data.meals?.length) collected.push(...data.meals);
    } catch (error) {
      console.error("MealDB search failed", error);
    }
  }

  if (!collected.length) {
    try {
      const randoms = await Promise.all(
        Array.from({ length: 4 }, () =>
          fetch("https://www.themealdb.com/api/json/v1/1/random.php").then((r) =>
            r.json(),
          ),
        ),
      );
      for (const data of randoms as { meals?: MealDbMeal[] | null }[]) {
        if (data.meals?.[0]) collected.push(data.meals[0]);
      }
    } catch (error) {
      console.error("MealDB random failed", error);
    }
  }

  const unique = new Map<string, MealDbMeal>();
  for (const meal of collected) unique.set(meal.idMeal, meal);

  let recipes = Array.from(unique.values()).map((meal) =>
    mealToRecipe(meal, prefs),
  );

  if (prefs.diet === "veg") {
    recipes = recipes.filter((r) => r.diet === "veg" || r.diet === "vegan");
  } else if (prefs.diet === "non-veg") {
    recipes = recipes.filter((r) => r.diet === "non-veg");
  }

  if (prefs.allergies.length) {
    recipes = recipes.filter(
      (r) =>
        !r.allergens.some((a) =>
          prefs.allergies.some((p) => p.toLowerCase() === a.toLowerCase()),
        ),
    );
  }

  if (recipes.length < 2) {
    recipes = Array.from(unique.values())
      .slice(0, 8)
      .map((meal) => mealToRecipe(meal, prefs));
  }

  const indian = recipes.filter(
    (r) =>
      /curry|dal|biryani|indian|masala|paneer|tikka|korma|vindaloo/i.test(
        `${r.name} ${r.category}`,
      ),
  );
  const other = recipes.filter((r) => !indian.includes(r));
  const shuffledIndian = indian
    .map((r) => ({ r, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ r }) => r);
  const shuffledOther = other
    .map((r) => ({ r, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ r }) => r);

  recipes = [
    ...shuffledIndian.slice(0, 5),
    ...shuffledOther.slice(0, 3),
    ...shuffledIndian.slice(5),
    ...shuffledOther.slice(3),
  ].slice(0, 8);

  return recipes.length ? recipes : null;
}

async function generateRecipes(
  prefs: RecipePreferences,
): Promise<RecipesResponse> {
  const aiRecipes = await generateWithOpenAI(prefs);
  if (aiRecipes?.length) return { recipes: aiRecipes, source: "ai" };

  const mealDbRecipes = await generateWithMealDb(prefs);
  if (mealDbRecipes?.length) return { recipes: mealDbRecipes, source: "ai" };

  return { recipes: fallbackRecipes(prefs), source: "fallback" };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RecipePreferences>;
    const prefs: RecipePreferences = {
      craving: body.craving ?? null,
      diet: body.diet === "veg" || body.diet === "non-veg" ? body.diet : "either",
      allergies: Array.isArray(body.allergies) ? body.allergies.map(String) : [],
      timeMinutes:
        typeof body.timeMinutes === "number" ? body.timeMinutes : null,
      effort: body.effort ?? null,
      indulgence: body.indulgence ?? "balanced",
      surprise: Boolean(body.surprise),
    };

    const payload = await generateRecipes(prefs);
    return Response.json(payload);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Could not generate recipes" },
      { status: 500 },
    );
  }
}
