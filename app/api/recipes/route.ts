import { recipeImageUrl } from "@/lib/options";
import type {
  CuisineId,
  EffortLevel,
  Indulgence,
  Recipe,
  RecipeDiet,
  RecipePreferences,
  RecipesResponse,
} from "@/lib/types";

export const runtime = "nodejs";

const CUISINE_IDS: CuisineId[] = [
  "indian",
  "mexican",
  "american",
  "italian",
  "chinese",
  "thai",
  "mediterranean",
  "other",
];

const SYSTEM_PROMPT = `You are Bitewize, an AI food decision assistant.
Recommend ONLY homemade recipes / cooked meals.
Never suggest restaurants, delivery, supplements, workouts, groceries to buy as products, meal plans, or lifestyle advice.
Return 8 creative, appetizing recipes as strict JSON only.
Vary cuisine, time, effort, diet, and healthy/indulgent balance so the user can filter.
Each recipe must feel specific and cookable, with realistic quantities and clear steps.
Cover a global mix of cuisines: Indian, Mexican, American, Italian, Chinese, Thai, and Mediterranean — not only one region.
Healthy recipes (indulgence: healthy) should emphasize salads, light bowls, grilled/steamed proteins, yogurt bowls, and high-veg dishes — not heavy fried or cream-laden food.
Sweet craving recipes should include desserts and sweet snacks: yogurt bowls, oat brownies, overnight oats, fruit parfaits, mug cakes, kheer, and similar.
When the user asks for sweet, return ONLY desserts/sweet snacks — never curries, masala, dal, biryani, or savory mains.
Comfort craving recipes should feel cozy / late-night / chill: hot chocolate, dal, soups, quick noodles, khichdi, grilled cheese, light mac & cheese, warm milk drinks, stews — not only heavy curries.
Include vegetarian and vegan options as well as non-veg.`;

function buildUserPrompt(prefs: RecipePreferences): string {
  const cravingHint =
    prefs.craving === "sweet"
      ? "Primary craving: sweet. ALL 8 recipes must be desserts or sweet snacks only (yogurt bowls, oat brownies, overnight oats, fruit parfaits, mug cakes, puddings, kheer, cookies) with a mix of healthy and indulgent. Do NOT include curries, masala, dal, biryani, sukha, vindaloo, chili garlic noodles, or any savory/spicy mains."
      : prefs.craving === "comfort"
        ? "Primary craving: comfort. Focus on cozy late-night / chill foods: hot chocolate, dal, soups, quick noodles, khichdi, grilled cheese, light mac & cheese, stews, warm drinks — not only heavy curries."
        : prefs.craving === "fresh"
          ? "Primary craving: fresh. Lean into salads, citrus, herbs, and light plates."
          : prefs.craving
            ? `Primary craving: ${prefs.craving}. Most recipes should match this craving, with a little variety.`
            : "Offer a mixed set across spicy, sweet, savory, comfort, fresh, and crunchy.";

  const parts = [
    prefs.surprise
      ? "Surprise the user with a mixed world set: Indian, Mexican, American, and other cuisines, including salads, sweets, and cozy comfort bowls."
      : null,
    cravingHint,
    prefs.diet === "veg"
      ? "Only vegetarian or vegan recipes (no meat, fish, or eggs)."
      : prefs.diet === "non-veg"
        ? "Include non-vegetarian options; still add 1–2 vegetarian/vegan sides or mains for balance."
        : "Include vegetarian, vegan, and non-vegetarian options.",
    prefs.craving === "sweet"
      ? "At least 2 of 8 sweet recipes should be healthier desserts (yogurt bowls, fruit, overnight oats); the rest can be more indulgent."
      : prefs.indulgence === "healthy" || !prefs.craving
        ? "At least 3 of 8 recipes must be healthy (indulgence: healthy), and most of those should be salads or light bowls."
        : "At least 2 of 8 recipes must be healthy (indulgence: healthy), preferably salads or light bowls.",
    prefs.craving === "sweet"
      ? "Vary cuisines among the sweets (e.g. Indian kheer, American brownies/oats, Mediterranean yogurt) — still desserts/snacks only."
      : "Include at least 2 Indian, 1 Mexican, and 1 American recipe when possible; fill the rest with Italian, Chinese, Thai, Mediterranean, or other.",
    prefs.craving === "sweet"
      ? "Only desserts and sweet snacks. Never return curries, dal, biryani, sabzi, tacos, salads-as-mains, or stir-fries."
      : "Include wet curries, dry curries/sabzi, tacos/bowls, salads, soups, noodles, sweets, skillets, pastas, and stir-fries as appropriate to the craving.",
    "Include a mix of cooking times from quick to about 45 minutes.",
    "Set cuisine to one of: indian, mexican, american, italian, chinese, thai, mediterranean, other.",
    prefs.craving === "sweet"
      ? 'Every recipe must have craving set to "sweet".'
      : null,
  ].filter(Boolean);

  return `Create 8 recipes matching:
${parts.map((p) => `- ${p}`).join("\n")}

Respond with JSON of this exact shape:
{
  "recipes": [
    {
      "id": "kebab-case-id",
      "name": "Recipe Name",
      "category": "short category like Curry / Tacos / Bowl / Salad",
      "cuisine": "indian|mexican|american|italian|chinese|thai|mediterranean|other",
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

function normalizeCuisine(value: unknown): CuisineId {
  const c = String(value || "").toLowerCase() as CuisineId;
  return CUISINE_IDS.includes(c) ? c : "other";
}

function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${name} recipe`,
  )}`;
}

const SAVORY_CURRY_RE =
  /\b(curry|masala|dal|dhal|biryani|sukha|vindaloo|korma|tikka|makhani|sabzi|chili[\s-]?garlic|chilli[\s-]?garlic)\b/i;
const SWEET_DISH_RE =
  /cake|pudding|chocolate|brownie|pancake|dessert|kheer|sweet|cookie|tart|pie|parfait|ice cream|halwa|gulab|yogurt|yoghurt|oat|muffin|custard|mousse|fudge|caramel|honey|berry|fruit bowl/i;

function looksLikeSavoryCurry(name: string, category = ""): boolean {
  const blob = `${name} ${category}`;
  if (SWEET_DISH_RE.test(blob) && /kheer|halwa|gulab|sweet|dessert|pudding/.test(blob.toLowerCase())) {
    return false;
  }
  return SAVORY_CURRY_RE.test(blob);
}

function looksLikeSweetDish(name: string, category = ""): boolean {
  return SWEET_DISH_RE.test(`${name} ${category}`);
}

function sanitizeCravingTag(
  craving: string,
  name: string,
  category = "",
): string {
  if (craving === "sweet" && looksLikeSavoryCurry(name, category)) {
    return "savory";
  }
  return craving;
}

function resolveYoutubeUrl(name: string, url?: string | null): string {
  const trimmed = url?.trim();
  if (trimmed) return trimmed;
  return youtubeSearchUrl(name);
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

  const category = String(raw.category || "Homemade");
  const craving = sanitizeCravingTag(
    String(raw.craving || "savory"),
    name,
    category,
  );

  return {
    id,
    name,
    category,
    cuisine: normalizeCuisine(raw.cuisine),
    description: String(raw.description || "A satisfying homemade meal."),
    imagePrompt,
    imageUrl: recipeImageUrl(imagePrompt, id),
    timeMinutes: Number(raw.timeMinutes) || 25,
    effort,
    diet,
    indulgence,
    craving,
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
    youtubeUrl: resolveYoutubeUrl(name, raw.youtubeUrl),
  };
}

function fallbackRecipes(prefs: RecipePreferences): Recipe[] {
  const craving = prefs.craving || "comfort";
  const healthyBias = prefs.indulgence === "healthy";
  const vegOnly = prefs.diet === "veg";
  const time = prefs.timeMinutes || 30;

  const pool: Array<
    Omit<Recipe, "imageUrl" | "cuisine"> & { cuisine?: CuisineId }
  > = [
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
    {
      id: "chicken-taco-bowl",
      name: "Chicken Taco Bowl",
      category: "Bowl",
      description: "Healthy Mexican bowl with spiced chicken, beans, and salsa.",
      imagePrompt: "chicken taco bowl with beans corn salsa and avocado",
      timeMinutes: Math.min(30, time),
      effort: "Easy",
      diet: "non-veg",
      indulgence: "healthy",
      craving: "savory",
      cuisine: "mexican",
      ingredients: [
        { item: "Chicken breast", quantity: "300 g" },
        { item: "Black beans", quantity: "1 cup" },
        { item: "Corn", quantity: "1/2 cup" },
        { item: "Salsa", quantity: "1/2 cup" },
        { item: "Avocado", quantity: "1/2" },
        { item: "Cumin", quantity: "1 tsp" },
      ],
      steps: [
        "Season chicken with cumin and sear until cooked through.",
        "Warm beans and corn.",
        "Slice chicken and build bowls with salsa and avocado.",
      ],
      allergens: [],
    },
    {
      id: "black-bean-tacos",
      name: "Black Bean Soft Tacos",
      category: "Tacos",
      description: "Vegan Mexican tacos with smoky beans and crunchy veg.",
      imagePrompt: "black bean soft tacos with cabbage and cilantro",
      timeMinutes: Math.min(20, time),
      effort: "Effortless",
      diet: "vegan",
      indulgence: "healthy",
      craving: "crunchy",
      cuisine: "mexican",
      ingredients: [
        { item: "Corn or flour tortillas", quantity: "6" },
        { item: "Black beans", quantity: "1.5 cups" },
        { item: "Onion", quantity: "1/2" },
        { item: "Chili powder", quantity: "1 tsp" },
        { item: "Lime", quantity: "1" },
        { item: "Cabbage", quantity: "1 cup shredded" },
      ],
      steps: [
        "Sauté onion, add beans and chili powder.",
        "Warm tortillas and fill with beans and cabbage.",
        "Finish with lime.",
      ],
      allergens: ["Gluten"],
    },
    {
      id: "turkey-veggie-skillet",
      name: "Turkey Veggie Skillet",
      category: "Skillet",
      description: "Lean American weeknight skillet with peppers and herbs.",
      imagePrompt: "turkey vegetable skillet in a cast iron pan",
      timeMinutes: Math.min(25, time),
      effort: "Easy",
      diet: "non-veg",
      indulgence: "healthy",
      craving: "savory",
      cuisine: "american",
      ingredients: [
        { item: "Ground turkey", quantity: "400 g" },
        { item: "Bell peppers", quantity: "2" },
        { item: "Onion", quantity: "1" },
        { item: "Garlic", quantity: "2 cloves" },
        { item: "Olive oil", quantity: "1 tbsp" },
        { item: "Italian herbs", quantity: "1 tsp" },
      ],
      steps: [
        "Brown turkey in olive oil.",
        "Add onion, peppers, garlic, and herbs.",
        "Cook until veg softens; season and serve.",
      ],
      allergens: [],
    },
    {
      id: "oatmeal-berry-bowl",
      name: "Berry Oatmeal Bowl",
      category: "Breakfast",
      description: "Warm American-style oats with berries and cinnamon.",
      imagePrompt: "oatmeal bowl with fresh berries and cinnamon",
      timeMinutes: Math.min(12, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "healthy",
      craving: "sweet",
      cuisine: "american",
      ingredients: [
        { item: "Rolled oats", quantity: "1/2 cup" },
        { item: "Milk or plant milk", quantity: "1 cup" },
        { item: "Mixed berries", quantity: "1/2 cup" },
        { item: "Cinnamon", quantity: "1/4 tsp" },
        { item: "Honey or maple", quantity: "1 tsp" },
      ],
      steps: [
        "Simmer oats in milk until creamy.",
        "Top with berries, cinnamon, and a drizzle of sweetener.",
      ],
      allergens: ["Dairy", "Gluten"],
    },
    {
      id: "tomato-basil-pasta",
      name: "Tomato Basil Pasta",
      category: "Pasta",
      description: "Simple Italian pasta with bright tomato and fresh basil.",
      imagePrompt: "spaghetti with tomato basil sauce",
      timeMinutes: Math.min(25, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "balanced",
      craving: "savory",
      cuisine: "italian",
      ingredients: [
        { item: "Spaghetti", quantity: "200 g" },
        { item: "Tomato passata", quantity: "2 cups" },
        { item: "Garlic", quantity: "3 cloves" },
        { item: "Basil", quantity: "a handful" },
        { item: "Olive oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Boil pasta until al dente.",
        "Simmer garlic in oil, add passata, then basil.",
        "Toss pasta in sauce and serve.",
      ],
      allergens: ["Gluten"],
    },
    {
      id: "greek-chickpea-salad",
      name: "Greek Chickpea Salad",
      category: "Salad",
      description: "Mediterranean chickpeas with cucumber, tomato, and lemon.",
      imagePrompt: "greek chickpea salad with cucumber tomato olives",
      timeMinutes: Math.min(15, time),
      effort: "Effortless",
      diet: "vegan",
      indulgence: "healthy",
      craving: "fresh",
      cuisine: "mediterranean",
      ingredients: [
        { item: "Chickpeas", quantity: "1.5 cups" },
        { item: "Cucumber", quantity: "1" },
        { item: "Tomato", quantity: "2" },
        { item: "Olives", quantity: "1/3 cup" },
        { item: "Lemon", quantity: "1" },
        { item: "Olive oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Chop cucumber and tomato.",
        "Toss with chickpeas, olives, lemon, and olive oil.",
        "Season and serve chilled.",
      ],
      allergens: [],
    },
    {
      id: "thai-basil-tofu",
      name: "Thai Basil Tofu",
      category: "Stir-fry",
      description: "Spicy Thai-style tofu with holy basil and chili.",
      imagePrompt: "thai basil tofu stir fry with chili and rice",
      timeMinutes: Math.min(20, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "balanced",
      craving: "spicy",
      cuisine: "thai",
      ingredients: [
        { item: "Firm tofu", quantity: "300 g" },
        { item: "Thai basil", quantity: "1 cup" },
        { item: "Garlic", quantity: "4 cloves" },
        { item: "Bird's eye chili", quantity: "2" },
        { item: "Soy sauce", quantity: "2 tbsp" },
        { item: "Oil", quantity: "2 tbsp" },
      ],
      steps: [
        "Crisp tofu cubes in oil.",
        "Stir-fry garlic and chili, return tofu with soy.",
        "Fold in basil and serve with rice.",
      ],
      allergens: ["Soy"],
    },
    {
      id: "quick-oat-brownies",
      name: "Quick Oat Brownies",
      category: "Sweet",
      description: "Fudgy cocoa oat brownies ready with pantry staples.",
      imagePrompt: "oat cocoa brownies cut into squares on a plate",
      timeMinutes: Math.min(25, time),
      effort: "Easy",
      diet: "veg",
      indulgence: healthyBias ? "balanced" : "indulgent",
      craving: "sweet",
      cuisine: "american",
      ingredients: [
        { item: "Rolled oats", quantity: "1 cup" },
        { item: "Cocoa powder", quantity: "1/3 cup" },
        { item: "Banana", quantity: "2 ripe" },
        { item: "Peanut butter", quantity: "3 tbsp" },
        { item: "Maple syrup or honey", quantity: "2 tbsp" },
        { item: "Baking powder", quantity: "1/2 tsp" },
      ],
      steps: [
        "Mash bananas and mix with peanut butter and sweetener.",
        "Stir in oats, cocoa, and baking powder.",
        "Spread in a small pan and bake at 180°C for 15–18 minutes.",
        "Cool slightly, cut into squares, and serve.",
      ],
      allergens: ["Nuts", "Gluten"],
    },
    {
      id: "greek-yogurt-honey-bowl",
      name: "Greek Yogurt Honey Bowl",
      category: "Sweet",
      description: "Creamy yogurt with honey, fruit, and a crunchy topping.",
      imagePrompt: "greek yogurt bowl with honey berries and granola",
      timeMinutes: Math.min(8, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "healthy",
      craving: "sweet",
      cuisine: "mediterranean",
      ingredients: [
        { item: "Greek yogurt", quantity: "1 cup" },
        { item: "Honey", quantity: "1 tbsp" },
        { item: "Berries", quantity: "1/2 cup" },
        { item: "Granola or toasted nuts", quantity: "1/4 cup" },
      ],
      steps: [
        "Spoon yogurt into a bowl.",
        "Drizzle honey and top with berries and granola.",
        "Eat immediately while cold and creamy.",
      ],
      allergens: ["Dairy", "Nuts"],
    },
    {
      id: "banana-overnight-oats",
      name: "Banana Overnight Oats",
      category: "Sweet",
      description: "Make-ahead creamy oats with banana and cinnamon.",
      imagePrompt: "overnight oats jar with banana slices and cinnamon",
      timeMinutes: Math.min(10, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "healthy",
      craving: "sweet",
      cuisine: "american",
      ingredients: [
        { item: "Rolled oats", quantity: "1/2 cup" },
        { item: "Milk or plant milk", quantity: "1/2 cup" },
        { item: "Banana", quantity: "1" },
        { item: "Chia seeds", quantity: "1 tsp" },
        { item: "Cinnamon", quantity: "1/4 tsp" },
      ],
      steps: [
        "Mash half the banana into oats with milk, chia, and cinnamon.",
        "Chill overnight (or 2 hours minimum).",
        "Top with remaining banana slices before eating.",
      ],
      allergens: ["Dairy", "Gluten"],
    },
    {
      id: "fruit-yogurt-parfait",
      name: "Fruit Yogurt Parfait",
      category: "Sweet",
      description: "Layered fruit, yogurt, and crunch for a quick sweet fix.",
      imagePrompt: "layered fruit yogurt parfait in a glass",
      timeMinutes: Math.min(8, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "healthy",
      craving: "sweet",
      cuisine: "american",
      ingredients: [
        { item: "Yogurt", quantity: "1 cup" },
        { item: "Mixed fruit", quantity: "1 cup" },
        { item: "Honey", quantity: "1 tsp" },
        { item: "Crushed biscuits or granola", quantity: "1/4 cup" },
      ],
      steps: [
        "Layer yogurt, fruit, and crunch in a glass.",
        "Repeat layers and finish with honey.",
      ],
      allergens: ["Dairy", "Gluten"],
    },
    {
      id: "chocolate-mug-cake",
      name: "Chocolate Mug Cake",
      category: "Sweet",
      description: "One-mug cocoa cake ready in minutes for late cravings.",
      imagePrompt: "chocolate mug cake with cocoa dusting",
      timeMinutes: Math.min(5, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "indulgent",
      craving: "sweet",
      cuisine: "american",
      ingredients: [
        { item: "Flour", quantity: "4 tbsp" },
        { item: "Cocoa powder", quantity: "2 tbsp" },
        { item: "Sugar", quantity: "2 tbsp" },
        { item: "Milk", quantity: "3 tbsp" },
        { item: "Oil", quantity: "1 tbsp" },
        { item: "Baking powder", quantity: "1/4 tsp" },
      ],
      steps: [
        "Mix dry ingredients in a mug, then stir in milk and oil.",
        "Microwave 60–90 seconds until risen and set.",
        "Cool a minute and dig in.",
      ],
      allergens: ["Dairy", "Gluten"],
    },
    {
      id: "quinoa-garden-salad",
      name: "Quinoa Garden Salad",
      category: "Salad",
      description: "Protein-packed salad with lemon dressing and crunchy veg.",
      imagePrompt: "quinoa salad bowl with cucumber tomato herbs lemon",
      timeMinutes: Math.min(20, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "healthy",
      craving: "fresh",
      cuisine: "mediterranean",
      ingredients: [
        { item: "Cooked quinoa", quantity: "1.5 cups" },
        { item: "Cucumber", quantity: "1" },
        { item: "Cherry tomatoes", quantity: "1 cup" },
        { item: "Parsley", quantity: "a handful" },
        { item: "Lemon juice", quantity: "2 tbsp" },
        { item: "Olive oil", quantity: "1 tbsp" },
      ],
      steps: [
        "Dice cucumber and halve tomatoes.",
        "Toss with quinoa, parsley, lemon, and olive oil.",
        "Season and serve chilled or room temp.",
      ],
      allergens: [],
    },
    {
      id: "asian-sesame-slaw",
      name: "Asian Sesame Slaw",
      category: "Salad",
      description: "Crunchy cabbage-carrot slaw with sesame-lime dressing.",
      imagePrompt: "asian sesame cabbage slaw in a bowl",
      timeMinutes: Math.min(12, time),
      effort: "Effortless",
      diet: "vegan",
      indulgence: "healthy",
      craving: "crunchy",
      cuisine: "chinese",
      ingredients: [
        { item: "Shredded cabbage", quantity: "3 cups" },
        { item: "Carrot", quantity: "1" },
        { item: "Sesame oil", quantity: "1 tsp" },
        { item: "Soy sauce", quantity: "1 tbsp" },
        { item: "Lime", quantity: "1/2" },
        { item: "Sesame seeds", quantity: "1 tsp" },
      ],
      steps: [
        "Toss cabbage and grated carrot.",
        "Whisk soy, sesame oil, and lime; dress the slaw.",
        "Finish with sesame seeds.",
      ],
      allergens: ["Soy"],
    },
    {
      id: "grilled-chicken-salad",
      name: "Grilled Chicken Salad",
      category: "Salad",
      description: "Light American salad with lemon-herb grilled chicken.",
      imagePrompt: "grilled chicken salad with greens tomato cucumber",
      timeMinutes: Math.min(25, time),
      effort: "Easy",
      diet: "non-veg",
      indulgence: "healthy",
      craving: "fresh",
      cuisine: "american",
      ingredients: [
        { item: "Chicken breast", quantity: "250 g" },
        { item: "Mixed greens", quantity: "4 cups" },
        { item: "Tomato", quantity: "1" },
        { item: "Cucumber", quantity: "1/2" },
        { item: "Olive oil", quantity: "1 tbsp" },
        { item: "Lemon", quantity: "1" },
      ],
      steps: [
        "Grill or pan-sear chicken with lemon and herbs until cooked.",
        "Slice and serve over greens with tomato and cucumber.",
        "Dress lightly with olive oil and lemon.",
      ],
      allergens: [],
    },
    {
      id: "cozy-hot-chocolate",
      name: "Cozy Hot Chocolate",
      category: "Drink",
      description: "Late-night cocoa, warm and gently sweet.",
      imagePrompt: "mug of hot chocolate with cocoa dusting",
      timeMinutes: Math.min(8, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "indulgent",
      craving: "comfort",
      cuisine: "american",
      ingredients: [
        { item: "Milk or plant milk", quantity: "1.5 cups" },
        { item: "Cocoa powder", quantity: "2 tbsp" },
        { item: "Sugar or maple", quantity: "1–2 tsp" },
        { item: "Vanilla", quantity: "1/4 tsp" },
        { item: "Pinch of salt", quantity: "1 pinch" },
      ],
      steps: [
        "Warm milk gently; whisk in cocoa, sweetener, and salt.",
        "Simmer 1–2 minutes until smooth and steamy.",
        "Stir in vanilla and sip slowly.",
      ],
      allergens: ["Dairy"],
    },
    {
      id: "miso-ginger-soup",
      name: "Miso Ginger Soup",
      category: "Soup",
      description: "Soothing broth with tofu, greens, and fresh ginger.",
      imagePrompt: "miso soup bowl with tofu greens and ginger",
      timeMinutes: Math.min(15, time),
      effort: "Easy",
      diet: "vegan",
      indulgence: "healthy",
      craving: "comfort",
      cuisine: "other",
      ingredients: [
        { item: "Miso paste", quantity: "2 tbsp" },
        { item: "Water or light stock", quantity: "3 cups" },
        { item: "Silken tofu", quantity: "150 g" },
        { item: "Fresh ginger", quantity: "1 tsp grated" },
        { item: "Spinach or bok choy", quantity: "1 cup" },
        { item: "Spring onion", quantity: "1 stalk" },
      ],
      steps: [
        "Warm stock with ginger; do not boil hard.",
        "Whisk miso in a ladle of hot liquid, then stir back in.",
        "Add tofu and greens to warm through; finish with spring onion.",
      ],
      allergens: ["Soy"],
    },
    {
      id: "instant-chili-noodles",
      name: "Instant Chili Garlic Noodles",
      category: "Noodles",
      description: "Late-night noodles with chili oil and garlic in one pan.",
      imagePrompt: "chili garlic instant noodles in a bowl",
      timeMinutes: Math.min(12, time),
      effort: "Effortless",
      diet: "vegan",
      indulgence: "indulgent",
      craving: "comfort",
      cuisine: "chinese",
      ingredients: [
        { item: "Instant noodles", quantity: "1 pack" },
        { item: "Garlic", quantity: "3 cloves" },
        { item: "Chili flakes", quantity: "1 tsp" },
        { item: "Soy sauce", quantity: "1 tbsp" },
        { item: "Sesame oil", quantity: "1 tsp" },
        { item: "Spring onion", quantity: "1 stalk" },
      ],
      steps: [
        "Boil noodles until just soft; drain, keep a splash of water.",
        "Bloom garlic and chili in sesame oil.",
        "Toss noodles with soy and reserved water; top with spring onion.",
      ],
      allergens: ["Gluten", "Soy"],
    },
    {
      id: "moong-khichdi-bowl",
      name: "Moong Khichdi Bowl",
      category: "Bowl",
      description: "Soft Indian khichdi — the ultimate slow-living comfort.",
      imagePrompt: "moong dal khichdi in a bowl with ghee tadka",
      timeMinutes: Math.min(30, time),
      effort: "Easy",
      diet: "veg",
      indulgence: "healthy",
      craving: "comfort",
      cuisine: "indian",
      ingredients: [
        { item: "Moong dal", quantity: "1/2 cup" },
        { item: "Rice", quantity: "1/2 cup" },
        { item: "Turmeric", quantity: "1/2 tsp" },
        { item: "Cumin seeds", quantity: "1 tsp" },
        { item: "Ghee or oil", quantity: "1 tbsp" },
        { item: "Ginger", quantity: "1 tsp" },
      ],
      steps: [
        "Rinse dal and rice; cook with turmeric until soft and porridge-like.",
        "Temper cumin and ginger in ghee; pour over khichdi.",
        "Serve warm with a squeeze of lemon if you like.",
      ],
      allergens: ["Dairy"],
    },
    {
      id: "grilled-cheese-tomato",
      name: "Grilled Cheese & Tomato Soup Sip",
      category: "Snack",
      description: "Crispy cheese toast with a mug of quick tomato soup.",
      imagePrompt: "grilled cheese sandwich beside tomato soup mug",
      timeMinutes: Math.min(18, time),
      effort: "Easy",
      diet: "veg",
      indulgence: "indulgent",
      craving: "comfort",
      cuisine: "american",
      ingredients: [
        { item: "Bread slices", quantity: "2" },
        { item: "Cheese slices", quantity: "2" },
        { item: "Butter", quantity: "1 tbsp" },
        { item: "Tomato puree", quantity: "1 cup" },
        { item: "Milk or stock", quantity: "1/2 cup" },
        { item: "Salt & pepper", quantity: "to taste" },
      ],
      steps: [
        "Butter bread, sandwich cheese, and toast until golden.",
        "Simmer puree with milk/stock into a quick soup.",
        "Dip and dunk — classic late-night comfort.",
      ],
      allergens: ["Dairy", "Gluten"],
    },
    {
      id: "light-mac-cheese",
      name: "Light Stovetop Mac & Cheese",
      category: "Pasta",
      description: "Creamy mac with a lighter milk sauce for chill nights.",
      imagePrompt: "bowl of creamy mac and cheese",
      timeMinutes: Math.min(20, time),
      effort: "Easy",
      diet: "veg",
      indulgence: "balanced",
      craving: "comfort",
      cuisine: "american",
      ingredients: [
        { item: "Elbow macaroni", quantity: "180 g" },
        { item: "Milk", quantity: "1.5 cups" },
        { item: "Cheddar", quantity: "3/4 cup grated" },
        { item: "Flour", quantity: "1 tbsp" },
        { item: "Butter", quantity: "1 tbsp" },
        { item: "Mustard powder", quantity: "1/4 tsp" },
      ],
      steps: [
        "Cook pasta until tender.",
        "Make a quick roux with butter and flour; whisk in milk.",
        "Melt cheese and mustard into sauce; fold in pasta.",
      ],
      allergens: ["Dairy", "Gluten"],
    },
    {
      id: "warm-turmeric-milk",
      name: "Warm Turmeric Milk",
      category: "Drink",
      description: "Golden milk — gentle, soothing, and sleep-friendly.",
      imagePrompt: "golden turmeric milk in a ceramic mug",
      timeMinutes: Math.min(7, time),
      effort: "Effortless",
      diet: "veg",
      indulgence: "healthy",
      craving: "comfort",
      cuisine: "indian",
      ingredients: [
        { item: "Milk or plant milk", quantity: "1.5 cups" },
        { item: "Turmeric", quantity: "1/2 tsp" },
        { item: "Black pepper", quantity: "a pinch" },
        { item: "Honey", quantity: "1 tsp" },
        { item: "Cardamom", quantity: "optional pinch" },
      ],
      steps: [
        "Warm milk with turmeric and pepper (do not boil hard).",
        "Sweeten with honey and sip warm.",
      ],
      allergens: ["Dairy"],
    },
  ];

  const cuisineById: Record<string, CuisineId> = {
    "butter-chicken-curry": "indian",
    "chana-masala-curry": "indian",
    "aloo-gobi-dry-curry": "indian",
    "bhindi-masala-dry": "indian",
    "palak-paneer-curry": "indian",
    "chicken-sukha-dry-curry": "indian",
    "tomato-dal-tadka": "indian",
    "paneer-bhurji-skillet": "indian",
    "chili-garlic-noodles": "chinese",
    "kheer-saffron-sweet": "indian",
    "lemon-herb-fish": "mediterranean",
    "kachumber-fresh-salad": "indian",
    "rajma-masala-vegan": "indian",
    "tofu-bhurji-vegan": "indian",
    "ginger-veg-stir-fry": "chinese",
    "chicken-taco-bowl": "mexican",
    "black-bean-tacos": "mexican",
    "turkey-veggie-skillet": "american",
    "oatmeal-berry-bowl": "american",
    "tomato-basil-pasta": "italian",
    "greek-chickpea-salad": "mediterranean",
    "thai-basil-tofu": "thai",
    "quick-oat-brownies": "american",
    "greek-yogurt-honey-bowl": "mediterranean",
    "banana-overnight-oats": "american",
    "fruit-yogurt-parfait": "american",
    "chocolate-mug-cake": "american",
    "quinoa-garden-salad": "mediterranean",
    "asian-sesame-slaw": "chinese",
    "grilled-chicken-salad": "american",
    "cozy-hot-chocolate": "american",
    "miso-ginger-soup": "other",
    "instant-chili-noodles": "chinese",
    "moong-khichdi-bowl": "indian",
    "grilled-cheese-tomato": "american",
    "light-mac-cheese": "american",
    "warm-turmeric-milk": "indian",
  };

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

  const preferred = filtered.filter((r) => {
    if (prefs.craving) return r.craving === prefs.craving;
    if (prefs.indulgence === "healthy") return r.indulgence === "healthy";
    return r.craving === craving || r.indulgence === prefs.indulgence;
  });

  // Sweet craving: never pad with savory/spicy curries — sweets only
  if (prefs.craving === "sweet") {
    const sweets = preferred.length
      ? preferred
      : filtered.filter((r) => r.craving === "sweet");
    return sweets.slice(0, 8).map((r) => ({
      ...r,
      cuisine: r.cuisine ?? cuisineById[r.id] ?? "other",
      imageUrl: recipeImageUrl(r.imagePrompt, r.id),
      youtubeUrl: resolveYoutubeUrl(r.name, r.youtubeUrl),
    }));
  }

  const ordered = [
    ...preferred,
    ...filtered.filter((r) => !preferred.includes(r)),
  ].slice(0, 8);

  return ordered.map((r) => ({
    ...r,
    cuisine: r.cuisine ?? cuisineById[r.id] ?? "other",
    imageUrl: recipeImageUrl(r.imagePrompt, r.id),
    youtubeUrl: resolveYoutubeUrl(r.name, r.youtubeUrl),
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
    let recipes = parsed.recipes.slice(0, 8).map(normalizeRecipe);
    if (prefs.craving === "sweet") {
      recipes = recipes.filter(
        (r) =>
          r.craving === "sweet" &&
          !looksLikeSavoryCurry(r.name, r.category),
      );
      if (recipes.length < 2) return null;
    }
    return recipes;
  } catch (error) {
    console.error("Failed to parse OpenAI recipes", error);
    return null;
  }
}

const MEALDB_QUERIES: Record<string, string[]> = {
  spicy: ["curry", "vindaloo", "masala", "chili"],
  sweet: [
    "chocolate",
    "pancake",
    "cake",
    "pudding",
    "brownie",
    "apple",
    "kheer",
    "gulab",
  ],
  savory: ["biryani", "paneer", "mushroom", "rice"],
  comfort: ["soup", "stew", "noodle", "dal", "macaroni", "broth"],
  fresh: ["salad", "vegetable", "salmon", "quinoa"],
  crunchy: ["potato", "samosa", "chicken", "toast", "slaw"],
  surprise: ["salad", "soup", "chocolate", "curry", "taco", "noodle"],
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
  strYoutube?: string | null;
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

function mealDbCuisine(meal: MealDbMeal): CuisineId {
  const area = (meal.strArea || "").toLowerCase();
  if (area === "indian") return "indian";
  if (area === "mexican") return "mexican";
  if (area === "american") return "american";
  if (area === "italian") return "italian";
  if (area === "chinese") return "chinese";
  if (area === "thai") return "thai";
  if (
    area === "greek" ||
    area === "moroccan" ||
    area === "egyptian" ||
    area === "tunisian" ||
    area === "croatian"
  ) {
    return "mediterranean";
  }
  return "other";
}

function mealToRecipe(meal: MealDbMeal, prefs: RecipePreferences): Recipe {
  const diet = mealDbDiet(meal);
  const cuisine = mealDbCuisine(meal);
  const effort: EffortLevel =
    prefs.effort ||
    (prefs.timeMinutes && prefs.timeMinutes <= 20 ? "Effortless" : "Easy");
  const timeMinutes = Math.min(
    prefs.timeMinutes || 35,
    prefs.timeMinutes ? prefs.timeMinutes : 35,
  );
  const name = meal.strMeal.toLowerCase();
  const isIndian = cuisine === "indian";
  let category = meal.strCategory || meal.strArea || "Homemade";
  if (isIndian) {
    if (/biryani|pulao|pilaf/.test(name)) category = "Biryani";
    else if (/dal|dhal|sambar/.test(name)) category = "Dal";
    else if (/dry|sukha|bhaji|sabzi|fry/.test(name)) category = "Dry Curry";
    else if (/curry|masala|korma|vindaloo|tikka|makhani|butter/.test(name))
      category = "Curry";
    else category = meal.strCategory || "Indian";
  } else if (cuisine === "mexican") {
    if (/taco|burrito|enchilada|quesadilla/.test(name)) category = "Tacos";
    else category = meal.strCategory || "Mexican";
  }

  const healthyHint =
    /salad|slaw|grill|steam|veg|lentil|bean|fish|tofu|broth|soup|quinoa|yogurt|oat/.test(
      name,
    );
  const sweetHint = looksLikeSweetDish(name, category);
  const savoryCurryHint = looksLikeSavoryCurry(name, category);
  const comfortHint =
    /soup|stew|noodle|dal|macaroni|broth|khichdi|grilled cheese|cocoa|milk|porridge/.test(
      `${name} ${category}`,
    );

  // Never inherit prefs.craving="sweet" onto savory curries / non-desserts
  let craving = "savory";
  if (sweetHint && !savoryCurryHint) {
    craving = "sweet";
  } else if (savoryCurryHint) {
    craving =
      prefs.craving === "spicy"
        ? "spicy"
        : prefs.craving === "comfort"
          ? "comfort"
          : "savory";
  } else if (!prefs.craving) {
    if (comfortHint) craving = "comfort";
    else if (healthyHint) craving = "fresh";
  } else if (prefs.craving === "sweet") {
    craving = "savory";
  } else if (prefs.craving === "comfort" && comfortHint) {
    craving = "comfort";
  } else {
    craving = prefs.craving;
  }

  craving = sanitizeCravingTag(craving, meal.strMeal, category);

  return {
    id: `mealdb-${meal.idMeal}`,
    name: meal.strMeal,
    category,
    cuisine,
    description: isIndian
      ? `An Indian home-style ${craving} pick ready for your table.`
      : `A satisfying ${cuisine} ${craving} pick from classic kitchen inspiration.`,
    imagePrompt: meal.strMeal,
    imageUrl:
      meal.strMealThumb ||
      recipeImageUrl(meal.strMeal, meal.idMeal),
    timeMinutes,
    effort,
    diet,
    indulgence: healthyHint
      ? "healthy"
      : sweetHint && /cake|brownie|pudding|chocolate/.test(name)
        ? "indulgent"
        : prefs.indulgence,
    craving,
    ingredients: mealDbIngredients(meal),
    steps: mealDbSteps(meal.strInstructions),
    allergens: inferAllergens(mealDbIngredients(meal).map((i) => i.item)),
    youtubeUrl: resolveYoutubeUrl(meal.strMeal, meal.strYoutube),
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

async function fetchAreaMeals(
  area: string,
  limit = 6,
): Promise<MealDbMeal[]> {
  const collected: MealDbMeal[] = [];
  try {
    const filterRes = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`,
    );
    if (filterRes.ok) {
      const data = (await filterRes.json()) as {
        meals?: { idMeal: string }[] | null;
      };
      const ids = (data.meals || [])
        .map((m) => m.idMeal)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
      const detailed = await Promise.all(ids.map((id) => lookupMeal(id)));
      for (const meal of detailed) {
        if (meal) collected.push(meal);
      }
    }
  } catch (error) {
    console.error(`MealDB ${area} filter failed`, error);
  }
  return collected;
}

async function fetchIndianMeals(): Promise<MealDbMeal[]> {
  const collected = await fetchAreaMeals("Indian", 10);

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

async function fetchCategoryMeals(
  category: string,
  limit = 6,
): Promise<MealDbMeal[]> {
  const collected: MealDbMeal[] = [];
  try {
    const filterRes = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`,
    );
    if (filterRes.ok) {
      const data = (await filterRes.json()) as {
        meals?: { idMeal: string }[] | null;
      };
      const ids = (data.meals || [])
        .map((m) => m.idMeal)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
      const detailed = await Promise.all(ids.map((id) => lookupMeal(id)));
      for (const meal of detailed) {
        if (meal) collected.push(meal);
      }
    }
  } catch (error) {
    console.error(`MealDB ${category} category failed`, error);
  }
  return collected;
}

async function generateWithMealDb(
  prefs: RecipePreferences,
): Promise<Recipe[] | null> {
  const cravingKey = prefs.craving || "comfort";
  const isSweet = cravingKey === "sweet";
  const queries = prefs.surprise
    ? [
        ...MEALDB_QUERIES.surprise,
        ...MEALDB_QUERIES.fresh,
        ...MEALDB_QUERIES.sweet,
        ...MEALDB_QUERIES.comfort,
      ]
    : isSweet
      ? [...MEALDB_QUERIES.sweet]
      : [
          ...(MEALDB_QUERIES[cravingKey] || MEALDB_QUERIES.comfort),
          ...(cravingKey === "comfort"
            ? MEALDB_QUERIES.fresh.slice(0, 1)
            : MEALDB_QUERIES.savory),
        ];

  const collected: MealDbMeal[] = [];

  const categoryBoost =
    prefs.craving === "sweet"
      ? fetchCategoryMeals("Dessert", 12)
      : prefs.craving === "comfort"
        ? Promise.all([
            fetchCategoryMeals("Starter", 4),
            fetchCategoryMeals("Side", 3),
          ]).then((chunks) => chunks.flat())
      : prefs.craving === "fresh" || prefs.indulgence === "healthy"
        ? fetchCategoryMeals("Vegetarian", 6)
        : Promise.resolve([] as MealDbMeal[]);

  // Sweet craving: desserts + sweet searches only — skip curry-heavy Indian/area pools
  const [
    indianMeals,
    vegetarianMeals,
    mexican,
    american,
    italian,
    chinese,
    thai,
    boosted,
  ] = await Promise.all([
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchIndianMeals(),
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchVegetarianMeals(),
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchAreaMeals("Mexican", 5),
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchAreaMeals("American", 5),
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchAreaMeals("Italian", 4),
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchAreaMeals("Chinese", 4),
    isSweet ? Promise.resolve([] as MealDbMeal[]) : fetchAreaMeals("Thai", 4),
    categoryBoost,
  ]);
  collected.push(
    ...indianMeals,
    ...vegetarianMeals,
    ...mexican,
    ...american,
    ...italian,
    ...chinese,
    ...thai,
    ...boosted,
  );

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

  if (isSweet) {
    recipes = recipes.filter(
      (r) =>
        r.craving === "sweet" &&
        !looksLikeSavoryCurry(r.name, r.category),
    );
    const shuffled = recipes
      .map((r) => ({ r, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ r }) => r)
      .slice(0, 8);
    return shuffled.length ? shuffled : null;
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
