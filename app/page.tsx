"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Clock,
  Coffee,
  Feather,
  Heart,
  List,
  Loader,
  Search,
  Shuffle,
  Youtube,
  Zap,
} from "react-feather";
import {
  ALLERGY_OPTIONS,
  CRAVINGS,
  CUISINE_OPTIONS,
  EFFORT_OPTIONS,
  INDULGENCE_OPTIONS,
  TIME_OPTIONS,
} from "@/lib/options";
import { PixelFoodArt } from "@/lib/pixel-art";
import { DishOnPlate } from "@/lib/plates";
import type {
  CravingId,
  Indulgence,
  Recipe,
  RecipePreferences,
  RecipesResponse,
  Step,
} from "@/lib/types";

const EMPTY_PREFS: RecipePreferences = {
  craving: null,
  diet: "either",
  allergies: [],
  timeMinutes: null,
  effort: null,
  indulgence: "balanced",
};

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [activeCraving, setActiveCraving] = useState<CravingId | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    craving: "all",
    cuisine: "all",
    diet: "all",
    allergy: "all",
    time: "all",
    effort: "all",
    indulgence: "all",
  });

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      if (filters.craving === "sweet") {
        // Sweet path: only recipes explicitly tagged sweet (never savory curries)
        if (recipe.craving !== "sweet") return false;
      } else if (
        filters.craving !== "all" &&
        recipe.craving !== filters.craving
      ) {
        return false;
      }
      if (filters.cuisine !== "all" && recipe.cuisine !== filters.cuisine) {
        return false;
      }
      if (filters.diet === "veg") {
        if (recipe.diet !== "veg" && recipe.diet !== "vegan") return false;
      } else if (filters.diet === "vegan") {
        if (recipe.diet !== "vegan") return false;
      } else if (filters.diet !== "all" && recipe.diet !== filters.diet) {
        return false;
      }
      if (
        filters.allergy !== "all" &&
        recipe.allergens.some(
          (a) => a.toLowerCase() === filters.allergy.toLowerCase(),
        )
      ) {
        return false;
      }
      if (filters.time !== "all") {
        const max = Number(filters.time);
        if (recipe.timeMinutes > max) return false;
      }
      if (filters.effort !== "all" && recipe.effort !== filters.effort) {
        return false;
      }
      if (
        filters.indulgence !== "all" &&
        recipe.indulgence !== filters.indulgence
      ) {
        return false;
      }
      return true;
    });
  }, [filters, recipes]);

  async function loadRecipes(options: {
    craving?: CravingId | null;
    surprise?: boolean;
  }) {
    const prefs: RecipePreferences = {
      ...EMPTY_PREFS,
      craving: options.surprise ? null : options.craving ?? null,
      surprise: Boolean(options.surprise),
    };

    setActiveCraving(options.surprise ? null : options.craving ?? null);
    setLoading(true);
    setError(null);
    setStep("results");
    setSelected(null);
    setFilters({
      craving: options.surprise ? "all" : options.craving ?? "all",
      cuisine: "all",
      diet: "all",
      allergy: "all",
      time: "all",
      effort: "all",
      indulgence: "all",
    });

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Could not get recipes");
      const data = (await res.json()) as RecipesResponse;
      setRecipes(data.recipes);
    } catch {
      setError("Something went wrong. Try again in a moment.");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  function resetHome() {
    setStep("home");
    setActiveCraving(null);
    setRecipes([]);
    setSelected(null);
    setError(null);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#fffbc0_0%,#fff8e1_45%,#f8f3ec_100%)] text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_center,rgba(255,100,13,0.08),transparent_65%)]"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-8 pt-6 sm:max-w-2xl sm:px-6 lg:max-w-4xl">
        <TopBar
          step={step}
          dishCount={filteredRecipes.length}
          loading={loading}
          showBack={step === "results" || Boolean(selected)}
          onHome={resetHome}
          onBack={() => {
            if (selected) {
              setSelected(null);
              return;
            }
            resetHome();
          }}
        />

        {step === "home" && !selected ? (
          <HomePicker
            onPick={(craving) => loadRecipes({ craving })}
            onSurprise={() => loadRecipes({ surprise: true })}
          />
        ) : null}

        {step === "results" && !selected ? (
          <ResultsView
            loading={loading}
            error={error}
            recipes={filteredRecipes}
            filters={filters}
            setFilters={setFilters}
            onSelect={setSelected}
            onRetry={() =>
              loadRecipes({
                craving: activeCraving,
                surprise: !activeCraving,
              })
            }
          />
        ) : null}

        {selected ? (
          <RecipeDetail recipe={selected} onBack={() => setSelected(null)} />
        ) : null}
      </div>
    </div>
  );
}

function TopBar({
  step,
  dishCount,
  loading,
  showBack,
  onBack,
  onHome,
}: {
  step: Step;
  dishCount: number;
  loading: boolean;
  showBack: boolean;
  onBack: () => void;
  onHome: () => void;
}) {
  const title =
    step === "home"
      ? "What are you craving?"
      : loading
        ? "Finding dishes…"
        : `${dishCount} dishes to cheer you up!`;

  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-black shadow-[0_6px_18px_rgba(42,26,14,0.08)]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onHome}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#fffdf6] text-foreground shadow-[0_6px_18px_rgba(42,26,14,0.08)]"
            aria-label="Bitewize home"
          >
            <Coffee size={18} strokeWidth={2} />
          </button>
        )}
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.22em] text-sage uppercase">
            Bitewize
          </p>
          <p className="truncate font-[family-name:var(--font-display)] text-lg leading-none text-foreground sm:text-xl">
            {title}
          </p>
        </div>
      </div>
    </header>
  );
}

function HomePicker({
  onPick,
  onSurprise,
}: {
  onPick: (craving: CravingId) => void;
  onSurprise: () => void;
}) {
  return (
    <main className="bite-rise flex flex-1 flex-col">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {CRAVINGS.map((craving) => (
          <button
            key={craving.id}
            type="button"
            onClick={() => onPick(craving.id)}
            className="press group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[1.25rem] border-2 border-white/30 text-left shadow-[0_14px_28px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:-translate-y-1"
            style={{ background: craving.color }}
          >
            <div className="relative z-10 px-3 pt-4 sm:px-4 sm:pt-5">
              <p
                className="font-[family-name:var(--font-poster)] text-[1.55rem] leading-none text-[#fffad5] sm:text-[1.75rem]"
                style={{
                  textShadow:
                    "0 1px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(0,0,0,0.25)",
                }}
              >
                {craving.label}
              </p>
              <p className="mt-1 text-xs text-white/80">{craving.hint}</p>
            </div>

            <div className="relative mt-auto flex flex-1 items-end justify-center pb-4 pt-2">
              <div className="rounded-lg bg-black/10 p-2 shadow-inner">
                <PixelFoodArt craving={craving.id} size={88} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onSurprise}
          className="press inline-flex items-center gap-2 rounded-2xl border border-line bg-card px-6 py-3.5 text-sm font-medium text-foreground shadow-[0_8px_20px_rgba(42,26,14,0.06)]"
        >
          <Shuffle size={16} strokeWidth={2} />
          Surprise me
        </button>
      </div>
    </main>
  );
}

function ResultsView({
  loading,
  error,
  recipes,
  filters,
  setFilters,
  onSelect,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  recipes: Recipe[];
  filters: {
    craving: string;
    cuisine: string;
    diet: string;
    allergy: string;
    time: string;
    effort: string;
    indulgence: string;
  };
  setFilters: Dispatch<
    SetStateAction<{
      craving: string;
      cuisine: string;
      diet: string;
      allergy: string;
      time: string;
      effort: string;
      indulgence: string;
    }>
  >;
  onSelect: (recipe: Recipe) => void;
  onRetry: () => void;
}) {
  return (
    <section className="bite-rise flex flex-1 flex-col">
      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <FilterSelect
          label="Craving"
          value={filters.craving}
          onChange={(value) => setFilters((f) => ({ ...f, craving: value }))}
          options={[
            { value: "all", label: "All" },
            ...CRAVINGS.map((c) => ({ value: c.id, label: c.label })),
          ]}
        />
        <FilterSelect
          label="Cuisine"
          value={filters.cuisine}
          onChange={(value) => setFilters((f) => ({ ...f, cuisine: value }))}
          options={[
            { value: "all", label: "All" },
            ...CUISINE_OPTIONS.map((c) => ({ value: c.id, label: c.label })),
          ]}
        />
        <FilterSelect
          label="Diet"
          value={filters.diet}
          onChange={(value) => setFilters((f) => ({ ...f, diet: value }))}
          options={[
            { value: "all", label: "All" },
            { value: "veg", label: "Veg" },
            { value: "vegan", label: "Vegan" },
            { value: "non-veg", label: "Non-veg" },
          ]}
        />
        <FilterSelect
          label="Allergies"
          value={filters.allergy}
          onChange={(value) => setFilters((f) => ({ ...f, allergy: value }))}
          options={[
            { value: "all", label: "Any" },
            ...ALLERGY_OPTIONS.map((a) => ({
              value: a,
              label: `No ${a}`,
            })),
          ]}
        />
        <FilterSelect
          label="Time"
          value={filters.time}
          onChange={(value) => setFilters((f) => ({ ...f, time: value }))}
          options={[
            { value: "all", label: "Any" },
            ...TIME_OPTIONS.map((t) => ({
              value: String(t.value),
              label: t.label,
            })),
          ]}
        />
        <FilterSelect
          label="Effort"
          value={filters.effort}
          onChange={(value) => setFilters((f) => ({ ...f, effort: value }))}
          options={[
            { value: "all", label: "Any" },
            ...EFFORT_OPTIONS.map((e) => ({ value: e, label: e })),
          ]}
        />
        <FilterSelect
          label="Style"
          value={filters.indulgence}
          onChange={(value) =>
            setFilters((f) => ({ ...f, indulgence: value }))
          }
          options={[
            { value: "all", label: "Any" },
            ...INDULGENCE_OPTIONS.map((i) => ({
              value: i.id,
              label: i.label,
            })),
          ]}
        />
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
          <Loader
            size={36}
            strokeWidth={2}
            className="animate-spin text-sage"
          />
          <p className="font-[family-name:var(--font-display)] text-2xl">
            Finding recipes…
          </p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <AlertCircle
            size={28}
            strokeWidth={2}
            className="mx-auto mb-3 text-muted"
          />
          <p className="mb-4 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white"
          >
            <Activity size={14} strokeWidth={2} />
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10">
          {recipes.map((recipe, index) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              index={index}
              onSelect={() => onSelect(recipe)}
            />
          ))}
          {recipes.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-line bg-card p-8 text-center">
              <Search
                size={28}
                strokeWidth={2}
                className="mx-auto mb-3 text-muted"
              />
              <p className="font-[family-name:var(--font-display)] text-xl text-foreground">
                Nothing matched those filters.
              </p>
              <p className="mt-2 text-sm text-muted">
                Clear a filter to see more recipes.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RecipeCard({
  recipe,
  index,
  onSelect,
}: {
  recipe: Recipe;
  index: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="press bite-rise flex flex-col items-center gap-3 bg-transparent text-left"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <DishOnPlate imageUrl={recipe.imageUrl} alt={recipe.name} />
      <div className="w-full space-y-2.5 px-1 text-center sm:text-left">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
            {recipe.cuisine} · {recipe.category}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg leading-snug text-foreground sm:text-xl">
            {recipe.name}
          </h3>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
          <MetaChip
            icon={<Clock size={11} strokeWidth={2} />}
            label={`${recipe.timeMinutes} min`}
          />
          <MetaChip
            icon={<Zap size={11} strokeWidth={2} />}
            label={recipe.effort}
          />
          <MetaChip
            icon={<Feather size={11} strokeWidth={2} />}
            label={dietChipLabel(recipe.diet)}
          />
          <MetaChip
            icon={<Heart size={11} strokeWidth={2} />}
            label={indulgenceLabel(recipe.indulgence)}
          />
        </div>
      </div>
    </button>
  );
}

function RecipeDetail({
  recipe,
  onBack,
}: {
  recipe: Recipe;
  onBack: () => void;
}) {
  return (
    <section className="bite-sheet overflow-hidden rounded-[1.5rem] border border-line bg-card shadow-[0_20px_50px_rgba(42,26,14,0.1)]">
      <div className="relative h-64 bg-[#ede8de] sm:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/10" />
      </div>

      <div className="space-y-6 px-5 pb-8 pt-5 sm:px-7">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-sage uppercase">
            {recipe.category}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-foreground sm:text-4xl">
            {recipe.name}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {recipe.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <MetaChip
            icon={<Feather size={11} strokeWidth={2} />}
            label={dietDetailLabel(recipe.diet)}
          />
          <MetaChip
            icon={<Clock size={11} strokeWidth={2} />}
            label={`${recipe.timeMinutes} min`}
          />
          <MetaChip
            icon={<Zap size={11} strokeWidth={2} />}
            label={recipe.effort}
          />
          <MetaChip
            icon={<Heart size={11} strokeWidth={2} />}
            label={indulgenceLabel(recipe.indulgence)}
          />
          <MetaChip
            icon={<Coffee size={11} strokeWidth={2} />}
            label={`Craving: ${recipe.craving}`}
          />
        </div>

        <div>
          <SectionLabel icon={<List size={12} strokeWidth={2} />}>
            Ingredients
          </SectionLabel>
          <ul className="mt-3 space-y-2">
            {recipe.ingredients.map((ing) => (
              <li
                key={`${ing.item}-${ing.quantity}`}
                className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 text-sm"
              >
                <span className="text-foreground">{ing.item}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-muted">
                  {ing.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionLabel icon={<BookOpen size={12} strokeWidth={2} />}>
            How to cook
          </SectionLabel>
          <ol className="mt-3 space-y-3">
            {recipe.steps.map((stepText, index) => (
              <li key={stepText} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sage/15 font-[family-name:var(--font-mono)] text-[11px] text-sage-deep">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground">
                  {stepText}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {recipe.youtubeUrl ? (
          <a
            href={recipe.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sage/25 bg-sage/10 px-5 py-3.5 text-sm font-semibold text-sage-deep transition-colors hover:bg-sage/15"
          >
            <Youtube size={16} strokeWidth={2} />
            {recipe.youtubeUrl.includes("/results?search_query=")
              ? "Find video on YouTube"
              : "Watch on YouTube"}
          </a>
        ) : null}

        <div>
          <SectionLabel icon={<AlertTriangle size={12} strokeWidth={2} />}>
            Allergens
          </SectionLabel>
          <p className="mt-2 text-sm text-muted">
            {recipe.allergens.length
              ? recipe.allergens.join(" · ")
              : "None called out"}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-[#fffdf6] px-5 py-3.5 text-sm font-semibold text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back to results
        </button>
      </div>
    </section>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.14em] text-muted uppercase">
      {icon ? <span className="inline-flex text-muted">{icon}</span> : null}
      {children}
    </p>
  );
}

function MetaChip({
  label,
  icon,
}: {
  label: string;
  icon?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#c8a2c8] px-2.5 py-1 text-[10px] font-medium tracking-[0.02em] text-black">
      {icon ? <span className="inline-flex">{icon}</span> : null}
      {label}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="m-2 flex flex-shrink-0 flex-col">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="appearance-none rounded-full border border-black bg-[#c8a2c8] py-2 pl-3 pr-9 font-[family-name:var(--font-poster)] text-xs uppercase text-white outline-none shadow-[0_4px_0_0_#000] [color-scheme:light] [-webkit-text-stroke:0.25px_#a081a0]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-white font-sans normal-case text-black"
            >
              {option.value === "all" ? label : option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white"
        >
          <ChevronDown size={14} strokeWidth={2.5} />
        </span>
      </div>
    </label>
  );
}

function dietChipLabel(diet: Recipe["diet"]): string {
  if (diet === "vegan") return "Vegan";
  if (diet === "veg") return "Veg";
  return "Non-veg";
}

function dietDetailLabel(diet: Recipe["diet"]): string {
  if (diet === "vegan") return "Vegan";
  if (diet === "veg") return "Vegetarian";
  return "Non-veg";
}

function indulgenceLabel(value: Indulgence): string {
  if (value === "healthy") return "Healthy";
  if (value === "indulgent") return "Indulgent";
  return "Balanced";
}
