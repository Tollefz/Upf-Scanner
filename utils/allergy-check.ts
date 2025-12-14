import type { AllergyType, AllergyPreferences } from './storage';

// Define OffProduct type locally to avoid circular dependency
type OffProduct = {
  product_name?: string;
  brands?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_da?: string;
  ingredients_text_en?: string;
  allergens?: string;
  allergens_tags?: string[];
  traces?: string;
  traces_tags?: string[];
};

export type AllergenHit = {
  allergen: string;
  matchedTerms: string[];
  source: "off" | "text";
};

export type AllergyResult = {
  status: "ok" | "no_ingredients";
  containsHits: AllergenHit[];
  mayContainHits: AllergenHit[];
};

// Allergy keyword patterns (NO/DA/EN)
const allergyPatterns: Record<AllergyType, RegExp[]> = {
  gluten: [
    /\bgluten\b/i,
    /\bwheat\b/i,
    /\bbygg\b/i,
    /\brug\b/i,
    /\brog\b/i,
    /\boats\b/i,
    /\bhavre\b/i,
    /\brye\b/i,
    /\bblé\b/i,
    /\bfarine\s+de\s+blé\b/i,
  ],
  melk: [
    /\bmelk\b/i,
    /\bhelmelk\b/i,
    /\blettmelk\b/i,
    /\bskummet\s+melk\b/i,
    /\bskummetmelk\b/i,
    /\bmilk\b/i,
    /\bwhole\s+milk\b/i,
    /\bskim\s+milk\b/i,
    /\blactose\b/i,
    /\blaktose\b/i,
    /\bcream\b/i,
    /\bfløte\b/i,
    /\bcheese\b/i,
    /\bost\b/i,
    /\bbutter\b/i,
    /\bsmør\b/i,
    /\byoghurt\b/i,
    /\byogurt\b/i,
    /\bmilk\s+powder\b/i,
    /\bmelkepulver\b/i,
    /\bwhey\b/i,
    /\bvalle\b/i,
    /\blait\b/i,
    // Handle OFF format with underscores: "pasteurisert _ melk _" or "pasteurisert_melk_"
    /\b_\s*melk\s*_\b/i,
    /\b_\s*milk\s*_\b/i,
    /\b_melk_\b/i,
    /\b_milk_\b/i,
    // Match "melk" even with underscores around it (OFF format)
    /[_\s]melk[_\s]/i,
    /[_\s]milk[_\s]/i,
  ],
  egg: [
    /\begg\b/i,
    /\beggs\b/i,
    /\bæg\b/i,
    /\bægg\b/i,
    /\bœuf\b/i,
    /\bœufs\b/i,
  ],
  soya: [
    /\bsoya\b/i,
    /\bsoy\b/i,
    /\bsoja\b/i,
    /\bsoybean\b/i,
    /\bsojabønne\b/i,
    /\btofu\b/i,
    /\bmiso\b/i,
  ],
  nøtter: [
    /\bnøtter\b/i,
    /\bnuts\b/i,
    /\bmandel\b/i,
    /\balmond\b/i,
    /\bvalnød\b/i,
    /\bwalnut\b/i,
    /\bhaselnød\b/i,
    /\bhazelnut\b/i,
    /\bcashew\b/i,
    /\bkasjubønne\b/i,
    /\bpecan\b/i,
    /\bmacadamia\b/i,
    /\bpistachio\b/i,
    /\bpistasj\b/i,
    /\bnoix\b/i,
    /\bamande\b/i,
    /\bnoisette\b/i,
  ],
  peanøtter: [
    /\bpeanøtt\b/i,
    /\bpeanut\b/i,
    /\bpeanuts\b/i,
    /\bpeanøtter\b/i,
    /\bgroundnut\b/i,
    /\barachide\b/i,
  ],
  sesam: [
    /\bsesam\b/i,
    /\bsesame\b/i,
    /\bsésame\b/i,
    /\btahini\b/i,
  ],
  fisk: [
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
  ],
  skalldyr: [
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
  ],
  sennep: [
    /\bsennep\b/i,
    /\bmustard\b/i,
    /\bsennepsfrø\b/i,
    /\bmoutarde\b/i,
  ],
};

// Check OFF tags for allergens
function checkOffTags(
  tags: string[] | undefined,
  allergenKey: string
): boolean {
  if (!tags) return false;
  const lowerKey = allergenKey.toLowerCase();
  return tags.some(tag => tag.toLowerCase().includes(lowerKey));
}

// Check OFF text fields for allergens
function checkOffText(
  text: string | undefined,
  allergenKey: string
): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const lowerKey = allergenKey.toLowerCase();
  return lowerText.includes(lowerKey);
}

// Check ingredients text for allergens using patterns
function checkIngredientsText(
  text: string,
  allergenType: AllergyType
): boolean {
  const patterns = allergyPatterns[allergenType];
  return patterns.some(pattern => pattern.test(text));
}

// Check for "may contain" / "kan inneholde" / "spor av" patterns
function checkMayContain(text: string): boolean {
  const mayContainPatterns = [
    /\bmay\s+contain\b/i,
    /\bmay\s+contain\s+traces?\s+of\b/i,
    /\btraces?\s+of\b/i,
    /\bkan\s+inneholde\b/i,
    /\bkan\s+inneholde\s+spor\s+av\b/i,
    /\bkan\s+innehalde\b/i,
    /\bkan\s+indeholde\s+spor\s+af\b/i,
    /\bspor\s+av\b/i,
    /\bspor\s+af\b/i,
    /\bpeut\s+contenir\b/i,
    /\bpeut\s+contenir\s+des?\s+trace\b/i,
    /\btraces?\s+de\b/i,
  ];
  return mayContainPatterns.some(pattern => pattern.test(text));
}

// Extract allergens from "may contain" context
function extractAllergensFromMayContain(text: string, allergenType: AllergyType): string[] {
  const matchedTerms: string[] = [];
  const patterns = allergyPatterns[allergenType];
  
  // Find position of "may contain" pattern
  const mayContainPatterns = [
    /\bmay\s+contain\s+traces?\s+of\b/i,
    /\bmay\s+contain\b/i,
    /\btraces?\s+of\b/i,
    /\bkan\s+inneholde\s+spor\s+av\b/i,
    /\bkan\s+inneholde\b/i,
    /\bkan\s+indeholde\s+spor\s+af\b/i,
    /\bkan\s+indeholde\b/i,
    /\bspor\s+av\b/i,
    /\bspor\s+af\b/i,
    /\bpeut\s+contenir\s+des?\s+trace\s+de\b/i,
    /\bpeut\s+contenir\b/i,
    /\btraces?\s+de\b/i,
  ];
  
  for (const mayPattern of mayContainPatterns) {
    const match = text.match(mayPattern);
    if (match) {
      // Get text after "may contain" (next 200 characters)
      const startIndex = match.index! + match[0].length;
      const contextText = text.substring(startIndex, startIndex + 200);
      
      // Check if allergen patterns match in this context
      for (const pattern of patterns) {
        const allergenMatch = contextText.match(pattern);
        if (allergenMatch) {
          matchedTerms.push(allergenMatch[0].trim());
        }
      }
    }
  }
  
  return matchedTerms;
}

export function checkAllergies(
  product: OffProduct | undefined,
  ingredientsText: string,
  preferences: AllergyPreferences
): AllergyResult {
  const result: AllergyResult = {
    status: ingredientsText && ingredientsText.trim().length > 0 ? "ok" : "no_ingredients",
    containsHits: [],
    mayContainHits: [],
  };

  if (!product) {
    // Even if no product, check if we have ingredients text
    if (ingredientsText && ingredientsText.trim().length > 0) {
      result.status = "ok";
    }
    return result;
  }

  // Get selected allergies
  const selectedAllergies = Object.entries(preferences)
    .filter(([_, selected]) => selected)
    .map(([key]) => key as AllergyType);

  if (selectedAllergies.length === 0) return result;

  // Check OFF data first (most reliable)
  const hasOffAllergenData = 
    product.allergens_tags?.length > 0 ||
    product.allergens ||
    product.traces_tags?.length > 0 ||
    product.traces;

  // Track which allergens we've found in OFF data
  const foundInOff = new Set<AllergyType>();

  if (hasOffAllergenData) {
    for (const allergen of selectedAllergies) {
      const allergenName = getAllergyDisplayName(allergen);
      const matchedTerms: string[] = [];

      // Check allergens (contains) - priority
      if (
        checkOffTags(product.allergens_tags, allergen) ||
        checkOffText(product.allergens, allergen)
      ) {
        // Extract matched terms from OFF data
        if (product.allergens_tags) {
          const matchingTag = product.allergens_tags.find(tag => 
            tag.toLowerCase().includes(allergen.toLowerCase())
          );
          if (matchingTag) matchedTerms.push(matchingTag);
        }
        if (product.allergens && product.allergens.toLowerCase().includes(allergen.toLowerCase())) {
          matchedTerms.push(allergenName);
        }
        
        result.containsHits.push({
          allergen: allergenName,
          matchedTerms: matchedTerms.length > 0 ? matchedTerms : [allergenName],
          source: "off",
        });
        foundInOff.add(allergen);
      }
      // Check traces (may contain) - only if not in contains
      else if (
        checkOffTags(product.traces_tags, allergen) ||
        checkOffText(product.traces, allergen)
      ) {
        // Extract matched terms from OFF data
        if (product.traces_tags) {
          const matchingTag = product.traces_tags.find(tag => 
            tag.toLowerCase().includes(allergen.toLowerCase())
          );
          if (matchingTag) matchedTerms.push(matchingTag);
        }
        if (product.traces && product.traces.toLowerCase().includes(allergen.toLowerCase())) {
          matchedTerms.push(allergenName);
        }
        
        result.mayContainHits.push({
          allergen: allergenName,
          matchedTerms: matchedTerms.length > 0 ? matchedTerms : [allergenName],
          source: "off",
        });
        foundInOff.add(allergen);
      }
    }
  }

  // Fallback to ingredients text matching
  // Only check allergens not already found in OFF data
  const hasIngredientsText = ingredientsText && ingredientsText.trim().length > 0;
  const hasMayContainText = hasIngredientsText && checkMayContain(ingredientsText);

  if (hasIngredientsText) {
    result.status = "ok";
  }

  for (const allergen of selectedAllergies) {
    // Skip if already found in OFF data
    if (foundInOff.has(allergen)) {
      continue;
    }

    const allergenName = getAllergyDisplayName(allergen);
    const matchedTerms: string[] = [];

    // Check ingredients text
    if (checkIngredientsText(ingredientsText, allergen)) {
      // Extract matched terms
      const patterns = allergyPatterns[allergen];
      for (const pattern of patterns) {
        const matches = ingredientsText.match(pattern);
        if (matches) {
          matches.forEach(m => {
            const term = m.trim();
            if (!matchedTerms.some(t => t.toLowerCase() === term.toLowerCase())) {
              matchedTerms.push(term);
            }
          });
        }
      }

      // Check if it's in a "may contain" context
      if (hasMayContainText) {
        // Try to extract from "may contain" context
        const mayContainTerms = extractAllergensFromMayContain(ingredientsText, allergen);
        if (mayContainTerms.length > 0) {
          result.mayContainHits.push({
            allergen: allergenName,
            matchedTerms: mayContainTerms.length > 0 ? mayContainTerms : matchedTerms,
            source: "text",
          });
        } else if (matchedTerms.length > 0) {
          // If allergen found near "may contain", add to mayContain
          result.mayContainHits.push({
            allergen: allergenName,
            matchedTerms,
            source: "text",
          });
        }
      } else {
        // Regular ingredient match - goes to contains
        if (matchedTerms.length > 0) {
          result.containsHits.push({
            allergen: allergenName,
            matchedTerms,
            source: "text",
          });
        }
      }
    }
  }

  return result;
}

export function getAllergyDisplayName(allergen: AllergyType): string {
  const names: Record<AllergyType, string> = {
    gluten: 'Gluten',
    melk: 'Melk',
    egg: 'Egg',
    soya: 'Soya',
    nøtter: 'Nøtter',
    peanøtter: 'Peanøtter',
    sesam: 'Sesam',
    fisk: 'Fisk',
    skalldyr: 'Skalldyr',
    sennep: 'Sennep',
  };
  return names[allergen];
}

