// General allergen detection based on ingredients list
// This is SEPARATE from user allergy preferences

export type AllergenHit = {
  allergen: string;
  matchedTerms: string[];
};

export type AllergenDetectionResult = {
  allergensFound: AllergenHit[];
  status: "ok" | "no_ingredients";
};

// Allergen patterns (NO/DA/EN/FR) - case-insensitive
const allergenPatterns: Record<string, RegExp[]> = {
  "Melk": [
    /\bmelk\b/i,
    /\bmelke/i,
    /\bmilk\b/i,
    /\blactose\b/i,
    /\blaktose\b/i,
    /\bwhey\b/i,
    /\bcream\b/i,
    /\bfløte\b/i,
    /\bbutter\b/i,
    /\bsmør\b/i,
    /\byoghurt\b/i,
    /\byogurt\b/i,
    /\bcheese\b/i,
    /\bost\b/i,
    /\bcheese\s+powder\b/i,
    /\bmilk\s+powder\b/i,
    /\bmelkepulver\b/i,
    /\blait\b/i,
    /\bfromage\b/i,
  ],
  "Gluten": [
    /\bgluten\b/i,
    /\bhvete\b/i,
    /\bwheat\b/i,
    /\bbygg\b/i,
    /\bbarley\b/i,
    /\brug\b/i,
    /\brye\b/i,
    /\bhavre\b/i,
    /\boats\b/i,
    /\bblé\b/i,
    /\bfarine\s+de\s+blé\b/i,
    /\bseigle\b/i,
    /\bavoine\b/i,
  ],
  "Egg": [
    /\begg\b/i,
    /\beggs\b/i,
    /\bæg\b/i,
    /\bægg\b/i,
    /\begg\s+powder\b/i,
    /\bægpulver\b/i,
    /\balbumin\b/i,
    /\bœuf\b/i,
    /\bœufs\b/i,
  ],
  "Soya": [
    /\bsoya\b/i,
    /\bsoy\b/i,
    /\bsoja\b/i,
    /\bsoybeans\b/i,
    /\bsojabønne\b/i,
    /\bsojalecitin\b/i,
    /\blecithin\s+\(soy\)\b/i,
    /\blecithin\s+\(soja\)\b/i,
    /\bsoja\s+lecithin\b/i,
  ],
  "Nøtter": [
    /\bnøtter\b/i,
    /\bnuts\b/i,
    /\bmandel\b/i,
    /\balmond\b/i,
    /\bhasselnøtt\b/i,
    /\bhazelnut\b/i,
    /\bcashew\b/i,
    /\bkasjubønne\b/i,
    /\bvalnøtt\b/i,
    /\bwalnut\b/i,
    /\bpistasj\b/i,
    /\bpistachio\b/i,
    /\bnoix\b/i,
    /\bamande\b/i,
    /\bnoisette\b/i,
    /\bnoix\s+de\s+cajou\b/i,
  ],
  "Peanøtter": [
    /\bpeanøtt\b/i,
    /\bpeanøtter\b/i,
    /\bpeanut\b/i,
    /\bpeanuts\b/i,
    /\bgroundnut\b/i,
    /\barachide\b/i,
  ],
  "Sesam": [
    /\bsesam\b/i,
    /\bsesame\b/i,
    /\bsésame\b/i,
    /\btahini\b/i,
  ],
  "Fisk": [
    /\bfisk\b/i,
    /\bfish\b/i,
    /\bpoisson\b/i,
    /\btorsk\b/i,
    /\bcod\b/i,
    /\blaks\b/i,
    /\bsalmon\b/i,
    /\bsei\b/i,
    /\bpollock\b/i,
    /\bansjos\b/i,
    /\banchovy\b/i,
    /\btunfisk\b/i,
    /\btuna\b/i,
  ],
  "Skalldyr": [
    /\bskalldyr\b/i,
    /\bshellfish\b/i,
    /\breker\b/i,
    /\bshrimp\b/i,
    /\bcrevette\b/i,
    /\bkreps\b/i,
    /\bcrab\b/i,
    /\bhummer\b/i,
    /\blobster\b/i,
    /\bscampi\b/i,
    /\bmuslinger\b/i,
    /\bmussels\b/i,
    /\bøsters\b/i,
    /\boysters\b/i,
    /\bcrustacés\b/i,
    /\bmollusques\b/i,
  ],
  "Sennep": [
    /\bsennep\b/i,
    /\bmustard\b/i,
    /\bsennepsfrø\b/i,
    /\bmoutarde\b/i,
  ],
};

export function detectAllergens(ingredientsText: string | null): AllergenDetectionResult {
  // Check if ingredients are available
  if (!ingredientsText || ingredientsText.trim().length === 0) {
    return {
      allergensFound: [],
      status: "no_ingredients",
    };
  }

  const text = ingredientsText.toLowerCase();
  const allergensFound: AllergenHit[] = [];

  // Check each allergen category
  for (const [allergen, patterns] of Object.entries(allergenPatterns)) {
    const matchedTerms: string[] = [];

    for (const pattern of patterns) {
      const matches = ingredientsText.match(pattern);
      if (matches) {
        // Add unique matched terms
        matches.forEach(match => {
          const term = match.trim();
          if (!matchedTerms.some(t => t.toLowerCase() === term.toLowerCase())) {
            matchedTerms.push(term);
          }
        });
      }
    }

    // If we found matches, add to results
    if (matchedTerms.length > 0) {
      allergensFound.push({
        allergen,
        matchedTerms,
      });
    }
  }

  return {
    allergensFound,
    status: "ok",
  };
}

