import { useColorScheme } from "@/hooks/use-color-scheme";
import { detectAllergens } from "@/utils/allergen-detection";
import { checkAllergies } from "@/utils/allergy-check";
import { getAllergyPreferences, isFavorite, saveToHistory, toggleFavorite, type AllergyPreferences, type FavoriteItem } from "@/utils/storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Button, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Development flag - set to false in production
const DEV_MODE = __DEV__;

type OffIngredient = {
  text?: string;
  id?: string;
};

type OffProduct = {
  product_name?: string;
  brands?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_da?: string;
  ingredients_text_en?: string;
  ingredients?: OffIngredient[];
  countries_tags?: string[];
  allergens?: string;
  allergens_tags?: string[];
  traces?: string;
  traces_tags?: string[];
};

type OffResponse = {
  status: number; // 1 = found, 0 = not found
  code: string;
  product?: OffProduct;
};

type UpfSignal = { label: string; match: string };
type UpfResult = {
  score: number; // 0-100
  level: "Grønn" | "Gul" | "Rød";
  signals: UpfSignal[];
};

function normalizeIngredients(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, " ")
    .replace(/[,.;:]/g, " ")
    .trim();
}

function upfScore(ingredientsText: string): UpfResult {
  const text = normalizeIngredients(ingredientsText);

  // Count E-numbers (case-insensitive)
  const eNumberMatches = text.match(/\be\d{3,4}[a-z]?\b/gi) || [];
  const eCount = eNumberMatches.length;
  // Count unique E-numbers
  const uniqueENumbers = new Set(eNumberMatches.map(e => e.toUpperCase()));
  const uniqueECount = uniqueENumbers.size;

  // Count additive keywords (NO/DA/EN/FR)
  const additiveKeywordPatterns = [
    // Emulgator
    /\bemulgator\b/i, /\bemulsifier\b/i, /\bemulsifiant\b/i,
    // Stabilisator
    /\bstabilisator\b/i, /\bstabilizer\b/i, /\bstabilisant\b/i,
    // Fortykningsmiddel
    /\bfortykningsmiddel\b/i, /\btykningsmiddel\b/i, /\bthickener\b/i, /\bépaississant\b/i,
    // Konserveringsmiddel
    /\bkonserveringsmiddel\b/i, /\bpreservative\b/i, /\bconservateur\b/i,
    // Surhetsregulerende
    /\bsurhetsregulerende\b/i, /\bacidity regulator\b/i, /\bcorrecteur\s+d['']acidité\b/i, /\bcorrecteurs\s+d['']acidité\b/i,
    // Fargestoff
    /\bfargestoff\b/i, /\bfarvestof\b/i, /\bcolour\b/i, /\bcolorant\b/i,
    // Aroma
    /\baroma\b/i, /\baromaer\b/i, /\bnaturlige aromaer\b/i,
    /\bflavour\b/i, /\bflavor\b/i, /\bflavouring\b/i, /\bflavoring\b/i, /\bflavourings\b/i, /\bflavors\b/i,
    /\barôme\b/i, /\barômes\b/i,
    // Smaksforsterker
    /\bsmaksforsterker\b/i, /\bflavour enhancer\b/i, /\bexhausteur de goût\b/i,
  ];

  let additiveKeywordCount = 0;
  const foundKeywords = new Set<string>();
  for (const pattern of additiveKeywordPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const key = match.toLowerCase();
        if (!foundKeywords.has(key)) {
          foundKeywords.add(key);
          additiveKeywordCount++;
        }
      });
    }
  }

  // Count additive categories (aroma, fargestoff, surhetsregulerende, konserveringsmiddel, emulgator, stabilisator, fortykningsmiddel, smaksforsterker)
  const additiveCategoryPatterns = [
    { category: "aroma", patterns: [/\baroma\b/i, /\baromaer\b/i, /\bflavour\b/i, /\bflavor\b/i, /\bflavouring\b/i, /\bflavoring\b/i, /\barôme\b/i, /\barômes\b/i] },
    { category: "fargestoff", patterns: [/\bfargestoff\b/i, /\bfarvestof\b/i, /\bcolour\b/i, /\bcolorant\b/i] },
    { category: "surhetsregulerende", patterns: [/\bsurhetsregulerende\b/i, /\bacidity regulator\b/i, /\bcorrecteur\s+d['']acidité\b/i, /\bcorrecteurs\s+d['']acidité\b/i] },
    { category: "konserveringsmiddel", patterns: [/\bkonserveringsmiddel\b/i, /\bpreservative\b/i, /\bconservateur\b/i] },
    { category: "emulgator", patterns: [/\bemulgator\b/i, /\bemulsifier\b/i, /\bemulsifiant\b/i] },
    { category: "stabilisator", patterns: [/\bstabilisator\b/i, /\bstabilizer\b/i, /\bstabilisant\b/i] },
    { category: "fortykningsmiddel", patterns: [/\bfortykningsmiddel\b/i, /\btykningsmiddel\b/i, /\bthickener\b/i, /\bépaississant\b/i] },
    { category: "smaksforsterker", patterns: [/\bsmaksforsterker\b/i, /\bflavour enhancer\b/i, /\bexhausteur de goût\b/i] },
  ];

  const foundCategories = new Set<string>();
  for (const cat of additiveCategoryPatterns) {
    for (const pattern of cat.patterns) {
      if (pattern.test(text)) {
        foundCategories.add(cat.category);
        break;
      }
    }
  }
  const additiveCategoryCount = foundCategories.size;

  // “Sterke” UPF-triggere (oppdatert med flere språkvarianter)
  const rules: Array<{ label: string; patterns: RegExp[]; weight: number }> = [
    { 
      label: "Aroma/smaksstoff", 
      patterns: [
        /\baroma\b/i, 
        /\baromaer\b/i,
        /\bnaturlige aromaer\b/i,
        /\bsmaksstoff\b/i, 
        /\bflavour\b/i,
        /\bflavor\b/i,
        /\bflavouring\b/i,
        /\bflavoring\b/i,
        /\bflavourings\b/i,
        /\bflavors\b/i,
        /\barôme\b/i,
        /\barômes\b/i
      ], 
      weight: 18 
    },
    { 
      label: "Smaksforsterker", 
      patterns: [
        /\bsmaksforsterker\b/i, 
        /\bmononatriumglutamat\b/i, 
        /\bmsg\b/i,
        /\bflavour enhancer\b/i,
        /\bexhausteur de goût\b/i
      ], 
      weight: 18 
    },
    { label: "Søtstoff", patterns: [/\bsøtstoff\b/i, /\baspartam\b/i, /\bsukralose\b/i, /\bacesulfam\b/i, /\bsorbitol\b/i], weight: 18 },
    { 
      label: "Emulgator", 
      patterns: [
        /\bemulgator\b/i, 
        /\blecitin\b/i, 
        /\blecithin\b/i,
        /\bemulsifier\b/i,
        /\bemulsifiant\b/i
      ], 
      weight: 14 
    },
    { 
      label: "Stabilisator", 
      patterns: [
        /\bstabilisator\b/i,
        /\bstabilizer\b/i,
        /\bstabilisant\b/i
      ], 
      weight: 12 
    },
    { 
      label: "Fortykningsmiddel", 
      patterns: [
        /\bfortykningsmiddel\b/i, 
        /\btykningsmiddel\b/i,
        /\bthickener\b/i,
        /\bépaississant\b/i
      ], 
      weight: 12 
    },
    { 
      label: "Fargestoff", 
      patterns: [
        /\bfargestoff\b/i, 
        /\bfarvestof\b/i, 
        /\bcolour\b/i,
        /\bcolorant\b/i
      ], 
      weight: 12 
    },
    { 
      label: "Konserveringsmiddel", 
      patterns: [
        /\bkonserveringsmiddel\b/i,
        /\bpreservative\b/i,
        /\bconservateur\b/i
      ], 
      weight: 12 
    },
    { 
      label: "Surhetsregulerende", 
      patterns: [
        /\bsurhetsregulerende\b/i,
        /\bacidity regulator\b/i,
        /\bcorrecteur\s+d['']acidité\b/i,
        /\bcorrecteurs\s+d['']acidité\b/i
      ], 
      weight: 12 
    },
    { label: "Modifisert stivelse", patterns: [/\bmodifisert stivelse\b/i, /\bmodified starch\b/i], weight: 14 },
    { label: "Maltodekstrin/dekstrose", patterns: [/\bmaltodekstrin\b/i, /\bdekstrose\b/i, /\bdextrose\b/i], weight: 14 },
    { label: "Sirup (glukose/fruktose)", patterns: [/\bglukosesirup\b/i, /\bfruktosesirup\b/i, /\bglucose-fructose\b/i], weight: 10 },
    { label: "Herdet/hydrogenert fett", patterns: [/\bherdet\b/i, /\bhydrogenert\b/i], weight: 14 },
    // E-numre som signal (brukes også i additive density)
    { label: "Tilsetningsstoff (E-nummer)", patterns: [/\be\d{3,4}[a-z]?\b/i], weight: 10 },
    // Isolater / industri-ingredienser (sterke UPF-signaler)
    { 
      label: "Isolat/protein isolat", 
      patterns: [
        /\bisolat\b/i,
        /\bisolate\b/i,
        /\bprotein isolate\b/i,
        /\bwhey isolate\b/i,
        /\bsoy isolate\b/i,
        /\bsoya isolate\b/i
      ], 
      weight: 22 
    },
    { 
      label: "Industriell fiber/prebiotikum", 
      patterns: [
        /\binulin\b/i,
        /\boligofructose\b/i,
        /\bpolydextrose\b/i,
        /\bresistant dextrin\b/i,
        /\bmodified cellulose\b/i
      ], 
      weight: 20 
    },
    // Sukker/raffinert-karbo signal
    { 
      label: "Sukker/raffinert karbohydrat", 
      patterns: [
        /\bsukker\b/i,
        /\bsugar\b/i,
        /\bglukose\b/i,
        /\bglucose\b/i,
        /\bdextrose\b/i,
        /\bdekstrose\b/i,
        /\bsirup\b/i,
        /\bsyrup\b/i,
        /\bglukosesirup\b/i,
        /\bglucose syrup\b/i,
        /\bfruktosesirup\b/i,
        /\bfructose syrup\b/i,
        /\binvert\b/i,
        /\bmaltodekstrin\b/i
      ], 
      weight: 12 
    },
  ];

  let score = 0;
  const signals: UpfSignal[] = [];

  // Track matches for combination detection
  let hasSugar = false;
  let hasAroma = false;
  let hasEmulsifier = false;
  let hasStabilizer = false;
  let hasThickener = false;
  let hasCarbonated = false;

  for (const r of rules) {
    for (const p of r.patterns) {
      const m = text.match(p);
      if (m) {
        score += r.weight;
        signals.push({ label: r.label, match: m[0] });
        
        // Track for combination detection
        if (r.label === "Sukker/raffinert karbohydrat" || 
            r.label === "Sirup (glukose/fruktose)" ||
            r.label === "Maltodekstrin/dekstrose") {
          hasSugar = true;
        }
        if (r.label === "Aroma/smaksstoff") {
          hasAroma = true;
        }
        if (r.label === "Emulgator") {
          hasEmulsifier = true;
        }
        if (r.label === "Stabilisator") {
          hasStabilizer = true;
        }
        if (r.label === "Fortykningsmiddel") {
          hasThickener = true;
        }
        
        break;
      }
    }
  }

  // Check for carbonated water/kolsyre
  const carbonatedPatterns = [
    /\bkarbonert\s+vann\b/i,
    /\bkolsyrat\s+vann\b/i,
    /\bcarbonated\s+water\b/i,
    /\bkolsyre\b/i,
    /\bcarbon\s+dioxide\b/i,
    /\be290\b/i
  ];
  for (const pattern of carbonatedPatterns) {
    if (pattern.test(text)) {
      hasCarbonated = true;
      break;
    }
  }

  // Kombinasjons-boost
  if (hasSugar && hasAroma) {
    score += 15;
    signals.push({ label: "Sukker + aroma", match: "kombinasjon" });
  }
  
  if (hasSugar && (hasEmulsifier || hasStabilizer || hasThickener)) {
    score += 15;
    signals.push({ label: "Sukker + emulgator/stabilisator", match: "kombinasjon" });
  }

  // Additive density scoring
  if (eCount >= 4) {
    score += 25;
  } else if (eCount >= 2) {
    score += 15;
  }

  if (additiveKeywordCount >= 4) {
    score += 20;
  } else if (additiveKeywordCount >= 2) {
    score += 10;
  }

  // Add signals for additive density
  if (uniqueECount > 0) {
    signals.push({ label: `Unike E-numre: ${uniqueECount}`, match: `${uniqueECount} E-numre` });
  }
  if (additiveCategoryCount > 0) {
    signals.push({ label: `Tilsetningskategorier: ${additiveCategoryCount}`, match: `${additiveCategoryCount} kategorier` });
  }

  // Minimal processing whitelist (kan redusere score for enkle råvarer)
  const whitelistPatterns = [
    /\bmelk\b/i, /\bmilk\b/i,
    /\bsalt\b/i,
    /\bløpe\b/i, /\brennet\b/i,
    /\bbakteriekultur\b/i, /\bculture\b/i, /\bcultures\b/i,
    /\bfløte\b/i, /\bcream\b/i,
    /\begg\b/i, /\beggs\b/i,
    /\btomat\b/i, /\btomato\b/i,
    /\bvann\b/i, /\bwater\b/i
  ];

  let whitelistMatchCount = 0;
  for (const pattern of whitelistPatterns) {
    if (pattern.test(text)) {
      whitelistMatchCount++;
    }
  }

  // Check if ingredients list is short and whitelist-heavy
  const approxCount = text.split(" ").filter(Boolean).length;
  const isWhitelistHeavy = whitelistMatchCount >= 2 && approxCount <= 15;

  // Drikke/cola-regel: hvis karbonert vann + (E-numre eller aroma) → minst rød (score >= 50)
  // Dette overstyrer whitelist
  let forceBrusRule = false;
  if (hasCarbonated && (eCount >= 1 || hasAroma)) {
    const hasAcidityRegulator = /\bsurhetsregulerende\b/i.test(text) || 
                                /\bacidity regulator\b/i.test(text) ||
                                /\bcorrecteur\s+d['']acidité\b/i.test(text);
    const hasColorant = /\bfargestoff\b/i.test(text) || 
                       /\bcolorant\b/i.test(text) ||
                       /\bcolour\b/i.test(text);
    
    if (eCount >= 1 || hasAroma || hasAcidityRegulator || hasColorant) {
      score = Math.max(score, 50); // Force minimum score of 50 (Rød)
      signals.push({ label: "Brus-regel (karbonert + tilsetninger)", match: "kombinasjon" });
      forceBrusRule = true;
    }
  }

  // “Lengde” på ingredienslista som ekstra signal
  if (approxCount > 60) score += 10;
  else if (approxCount > 35) score += 6;

  // Minimal processing whitelist: cap score til max 10 hvis kort liste og råvarepreget
  // Men ikke hvis brus-regel er aktiv
  if (isWhitelistHeavy && !forceBrusRule && score > 10) {
    score = 10;
  }

  // Clamp 0–100
  score = Math.max(0, Math.min(100, score));

  // Oppdaterte terskler: Grønn < 15, Gul 15-39, Rød >= 40
  const level: UpfResult["level"] = score >= 40 ? "Rød" : score >= 15 ? "Gul" : "Grønn";

  // Begrens forklaringer til de viktigste (inkluderer kombinasjons-triggere og additive density)
  const topSignals = signals.slice(0, 10);

  return { score, level, signals: topSignals };
}

// Simple in-memory cache for OFF products (per session)
const offCache = new Map<string, { data: OffResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchOffProduct(barcode: string, retryCount = 0): Promise<OffResponse> {
  // Check cache first
  const cached = offCache.get(barcode);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}.json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OFF HTTP ${res.status}`);
    }

    const data = (await res.json()) as OffResponse;
    
    // Cache the result
    offCache.set(barcode, { data, timestamp: Date.now() });
    
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Tidsavbrudd - Open Food Facts svarte ikke i tide. Prøv igjen.');
    }
    throw error;
  }
}

export default function Index() {
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [off, setOff] = useState<OffResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [showUpfExplanation, setShowUpfExplanation] = useState(false);
  const [allergyPrefs, setAllergyPrefs] = useState<AllergyPreferences>({
    gluten: false,
    melk: false,
    egg: false,
    soya: false,
    nøtter: false,
    peanøtter: false,
    sesam: false,
    fisk: false,
    skalldyr: false,
    sennep: false,
  });

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Handle barcode from params (when navigating from history)
  useEffect(() => {
    if (params.barcode && typeof params.barcode === 'string') {
      setBarcode(params.barcode);
      setScanned(true);
    }
  }, [params.barcode]);

  // Fallback for ingredients: try text fields first, then build from ingredients array
  const ingredientsText = useMemo(() => {
    const textFromFields =
      off?.product?.ingredients_text_da ||
      off?.product?.ingredients_text ||
      off?.product?.ingredients_text_en ||
      "";

    if (textFromFields) return textFromFields;

    // Fallback: build from ingredients array
    if (off?.product?.ingredients && Array.isArray(off.product.ingredients)) {
      const built = off.product.ingredients
        .map((ing) => ing.text)
        .filter(Boolean)
        .join(", ");
      if (built) return built;
    }

    return "";
  }, [off?.product]);

  // Check if ingredients text is too short and try fallback
  const finalIngredientsText = useMemo(() => {
    if (ingredientsText.length >= 15) return ingredientsText;
    
    // Try fallback from ingredients array if text is too short
    if (off?.product?.ingredients && Array.isArray(off.product.ingredients)) {
      const built = off.product.ingredients
        .map((ing) => ing.text)
        .filter(Boolean)
        .join(", ");
      if (built && built.length >= 15) return built;
    }
    
    return ingredientsText;
  }, [ingredientsText, off?.product]);

  const upf = useMemo(() => {
    if (!finalIngredientsText) return null;
    return upfScore(finalIngredientsText);
  }, [finalIngredientsText]);

  // Load allergy preferences - reload when tab gets focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const prefs = await getAllergyPreferences();
        setAllergyPrefs(prefs);
      })();
    }, [])
  );

  // Check allergies (user preferences)
  const allergyResult = useMemo(() => {
    if (!off?.product) {
      // Even without product, check if we have ingredients text
      return checkAllergies(undefined, finalIngredientsText, allergyPrefs);
    }
    return checkAllergies(off.product, finalIngredientsText, allergyPrefs);
  }, [off?.product, finalIngredientsText, allergyPrefs]);

  // General allergen detection (separate from user preferences)
  const allergenDetection = useMemo(() => {
    return detectAllergens(finalIngredientsText);
  }, [finalIngredientsText]);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!barcode) return;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        setOff(null);
        const data = await fetchOffProduct(barcode);
        setOff(data);
      } catch (e: any) {
        setErr(e?.message ?? "Ukjent feil");
      } finally {
        setLoading(false);
      }
    })();
  }, [barcode, retryKey]);

  const handleRetry = () => {
    setRetryKey(prev => prev + 1);
  };

  // Check favorite status when product is loaded
  useEffect(() => {
    if (barcode && off?.status === 1) {
      (async () => {
        const fav = await isFavorite(barcode);
        setIsFav(fav);
      })();
    }
  }, [barcode, off?.status]);

  // Save to history when product is successfully scanned
  useEffect(() => {
    if (off?.status === 1 && upf && barcode && !loading) {
      (async () => {
        await saveToHistory({
          barcode,
          product_name: off.product?.product_name || "Ukjent navn",
          brands: off.product?.brands,
          upfLevel: upf.level,
          score: upf.score,
          scannedAt: Date.now(),
        });
      })();
    }
  }, [off?.status, upf, barcode, loading]);

  if (!permission) return <Text>Laster kameratilgang…</Text>;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text style={{ marginBottom: 12 }}>
          Vi trenger tilgang til kamera for å scanne strekkoder.
        </Text>
        <Button title="Gi kameratilgang" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!barcode ? (
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
          }}
          onBarcodeScanned={
            scanned
              ? undefined
              : (result) => {
                  setScanned(true);
                  setBarcode(result.data);
                }
          }
        />
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { backgroundColor: isDark ? "#000" : "#fff" }]}
          style={styles.scrollView}
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={[styles.loadingText, { color: isDark ? "#fff" : "#000" }]}>
                Henter produkt fra Open Food Facts…
              </Text>
            </View>
          )}

          {err && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Feil oppstod:</Text>
              <Text style={styles.errorText}>{err}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                onPress={handleRetry}
              >
                <Text style={[styles.retryButtonText, { color: isDark ? "#fff" : "#000" }]}>
                  Prøv igjen
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {off?.status === 0 && (
            <View style={styles.notFoundContainer}>
              <Text style={styles.notFoundTitle}>
                Produktet finnes ikke i databasen ennå
              </Text>
              <Text style={styles.notFoundSubtext}>
                Strekkode: {barcode}
              </Text>
              <Text style={styles.notFoundDescription}>
                Dette produktet er ikke registrert i Open Food Facts-databasen. Du kan bidra ved å legge det til på openfoodfacts.org
              </Text>
            </View>
          )}

          {off?.status === 1 && (
            <>
              {/* Product info at top */}
              <View style={styles.productHeader}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.barcodeText, { color: isDark ? "#fff" : "#000" }]}>
                      Strekkode: {barcode}
                    </Text>
                    <Text style={[styles.productName, { color: isDark ? "#fff" : "#000" }]}>
                      {off.product?.product_name || "Ukjent navn"}
                    </Text>
                    {!!off.product?.brands && (
                      <Text style={[styles.brandText, { color: isDark ? "#ccc" : "#666" }]}>
                        Merke: {off.product.brands}
                      </Text>
                    )}
                  </View>
                  {/* Favorite button */}
                  {upf && (
                    <TouchableOpacity
                      onPress={async () => {
                        if (upf) {
                          const favoriteItem: FavoriteItem = {
                            barcode,
                            product_name: off.product?.product_name || "Ukjent navn",
                            brands: off.product?.brands,
                            upfLevel: upf.level,
                            score: upf.score,
                          };
                          const newFavStatus = await toggleFavorite(favoriteItem);
                          setIsFav(newFavStatus);
                        }
                      }}
                      style={styles.favoriteButton}
                    >
                      <Text style={styles.favoriteButtonText}>
                        {isFav ? "★" : "☆"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Warning if ingredients text is too short */}
              {finalIngredientsText.length < 15 && (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>
                    ⚠️ Ingrediensliste er veldig kort/mangler
                  </Text>
                </View>
              )}

              {/* Allergen detection (general, not user-specific) - OVER UPF-score */}
              {off?.status === 1 && (
                <View style={styles.allergenSection}>
                  <Text style={[styles.allergenSectionTitle, { color: isDark ? "#fff" : "#000" }]}>
                    Allergener
                  </Text>
                  {allergenDetection.status === "no_ingredients" ? (
                    <View style={[styles.allergenBox, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                      <Text style={[styles.allergenText, { color: isDark ? "#888" : "#666" }]}>
                        Kan ikke vurdere allergener (mangler ingrediensliste)
                      </Text>
                    </View>
                  ) : allergenDetection.allergensFound.length > 0 ? (
                    <View style={[styles.allergenBox, styles.allergenBoxFound]}>
                      <Text style={styles.allergenBoxTitle}>⚠️ Inneholder:</Text>
                      <Text style={styles.allergenBoxText}>
                        {allergenDetection.allergensFound.map(a => a.allergen).join(', ')}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.allergenBox, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                      <Text style={[styles.allergenText, { color: isDark ? "#44ff44" : "#22aa22" }]}>
                        Ingen kjente allergener funnet
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Allergy warnings (user preferences) */}
              {Object.values(allergyPrefs).some(v => v) && (
                <View style={styles.allergyContainer}>
                  {allergyResult.status === "no_ingredients" && !off?.product?.allergens && !off?.product?.traces ? (
                    <View style={[styles.allergyBox, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                      <Text style={[styles.allergenText, { color: isDark ? "#888" : "#666" }]}>
                        Kan ikke vurdere allergener (mangler ingrediensliste)
                      </Text>
                    </View>
                  ) : (
                    <>
                      {allergyResult.containsHits.length > 0 && (
                        <View style={[styles.allergyBox, styles.allergyBoxContains]}>
                          <Text style={styles.allergyBoxTitle}>🔴 Inneholder:</Text>
                          <Text style={styles.allergyBoxText}>
                            {allergyResult.containsHits.map(h => h.allergen).join(', ')}
                          </Text>
                        </View>
                      )}
                      {allergyResult.mayContainHits.length > 0 && (
                        <View style={[styles.allergyBox, styles.allergyBoxMayContain]}>
                          <Text style={styles.allergyBoxTitle}>🟡 Kan inneholde spor av:</Text>
                          <Text style={styles.allergyBoxText}>
                            {allergyResult.mayContainHits.map(h => h.allergen).join(', ')}
                          </Text>
                        </View>
                      )}
                      {allergyResult.containsHits.length === 0 && allergyResult.mayContainHits.length === 0 && (
                        <Text style={[styles.allergySafe, { color: isDark ? "#44ff44" : "#22aa22" }]}>
                          🟢 Ingen valgte allergener funnet
                        </Text>
                      )}
                    </>
                  )}
                  {/* Allergy disclaimer */}
                  {Object.values(allergyPrefs).some(v => v) && (
                    <Text style={[styles.allergyDisclaimer, { color: isDark ? "#888" : "#666" }]}>
                      Data kan være ufullstendig. Ved alvorlig allergi: les alltid emballasjen.
                    </Text>
                  )}
                </View>
              )}

              {/* UPF Score Display */}
              {finalIngredientsText && upf && (
                <View style={styles.upfContainer}>
                  <Text style={[styles.upfTitle, { color: isDark ? "#fff" : "#000" }]}>
                    Ultraprosessert-score
                  </Text>
                  
                  <View style={[
                    styles.upfScoreBox,
                    { 
                      backgroundColor: upf.level === "Rød" ? "#ff4444" : 
                                      upf.level === "Gul" ? "#ffaa00" : "#44ff44",
                    }
                  ]}>
                    <Text style={styles.upfLevel}>
                      {upf.level === "Rød" ? "Sannsynlig ultraprosessert" :
                       upf.level === "Gul" ? "Mulig ultraprosessert" :
                       "Lite sannsynlig ultraprosessert"}
                    </Text>
                    <Text style={styles.upfScore}>{upf.score}/100</Text>
                  </View>

                  <Text style={[styles.whyTitle, { color: isDark ? "#fff" : "#000" }]}>
                    Hvorfor:
                  </Text>
                  {upf.signals.length > 0 ? (
                    <View style={styles.signalsList}>
                      {upf.signals.map((s, i) => (
                        <Text key={i} style={[styles.signalItem, { color: isDark ? "#fff" : "#000" }]}>
                          • {s.label} (fant: "{s.match}")
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.noSignals, { color: isDark ? "#ccc" : "#666" }]}>
                      • Ingen tydelige UPF-signaler funnet
                    </Text>
                  )}

                  {/* Explanation button */}
                  <TouchableOpacity
                    style={[styles.explanationButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                    onPress={() => setShowUpfExplanation(true)}
                  >
                    <Text style={[styles.explanationButtonText, { color: isDark ? "#fff" : "#000" }]}>
                      Hva betyr dette?
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* UPF Explanation Modal */}
              <Modal
                visible={showUpfExplanation}
                transparent
                animationType="slide"
                onRequestClose={() => setShowUpfExplanation(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>
                        Om ultraprosesserte produkter
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowUpfExplanation(false)}
                        style={styles.modalCloseButton}
                      >
                        <Text style={[styles.modalCloseText, { color: isDark ? "#fff" : "#000" }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                      <Text style={[styles.modalText, { color: isDark ? "#ccc" : "#666" }]}>
                        {upf?.level === "Rød" 
                          ? "Sannsynlig ultraprosessert betyr at produktet inneholder flere signaler som ofte finnes i industrielt framstilte produkter."
                          : upf?.level === "Gul"
                          ? "Mulig ultraprosessert betyr at produktet kan inneholde noen signaler som ofte finnes i industrielt framstilte produkter."
                          : "Lite sannsynlig ultraprosessert betyr at produktet har få eller ingen signaler som tyder på industriell prosessering."}
                      </Text>
                      {upf && upf.signals.length > 0 && (
                        <Text style={[styles.modalText, { color: isDark ? "#ccc" : "#666", marginTop: 12 }]}>
                          Dette produktet inneholder {upf.signals.slice(0, 3).map(s => s.label.toLowerCase()).join(", ")}{upf.signals.length > 3 ? " og flere" : ""}, som ofte brukes i industrielt framstilte produkter.
                        </Text>
                      )}
                      <Text style={[styles.modalText, { color: isDark ? "#888" : "#999", marginTop: 12, fontStyle: "italic" }]}>
                        Dette er en indikasjon basert på ingrediensliste, ikke en medisinsk garanti.
                      </Text>
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              {/* Ingredients in ScrollView */}
              {finalIngredientsText ? (
                <View style={styles.ingredientsContainer}>
                  <Text style={[styles.ingredientsTitle, { color: isDark ? "#fff" : "#000" }]}>
                    Ingredienser:
                  </Text>
                  <ScrollView 
                    style={[styles.ingredientsScrollView, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                    contentContainerStyle={styles.ingredientsScrollContent}
                  >
                    <Text style={[styles.ingredientsText, { color: isDark ? "#fff" : "#000" }]}>
                      {finalIngredientsText}
                    </Text>
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.missingIngredientsContainer}>
                  <Text style={styles.missingIngredientsTitle}>
                    Fant produkt, men mangler ingrediensliste
                  </Text>
                  <Text style={styles.missingIngredientsText}>
                    Produktet ble funnet i databasen, men ingredienslisten er ikke tilgjengelig. Dette kan skje hvis produktet ikke er fullstendig registrert ennå.
                  </Text>
                  <Text style={[styles.missingIngredientsText, { marginTop: 8, fontSize: 12 }]}>
                    Du kan bidra ved å legge til ingrediensliste på openfoodfacts.org
                  </Text>
                </View>
              )}

              {/* Disclaimer */}
              {finalIngredientsText && upf && (
                <Text style={[styles.disclaimer, { color: isDark ? "#888" : "#666" }]}>
                  Dette er en indikasjon basert på ingrediensliste og tilsetningsmønstre.
                </Text>
              )}

              {/* Report bug button */}
              {off?.status === 1 && (
                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                  onPress={async () => {
                    const reportText = [
                      `Barcode: ${barcode}`,
                      `Produktnavn: ${off.product?.product_name || "Ukjent"}`,
                      `Ingrediens lengde: ${finalIngredientsText.length} tegn`,
                      `UPF Score: ${upf?.score || "N/A"}/100`,
                      `UPF Nivå: ${upf?.level || "N/A"}`,
                      `Signals: ${upf?.signals.map(s => s.label).join(", ") || "Ingen"}`,
                      `OFF Status: ${off.status}`,
                      err ? `Feil: ${err}` : "",
                    ].filter(Boolean).join("\n");

                    await Clipboard.setStringAsync(reportText);
                    Alert.alert("Kopiert", "Feilmelding er kopiert – lim inn og send til meg");
                  }}
                >
                  <Text style={[styles.reportButtonText, { color: isDark ? "#fff" : "#000" }]}>
                    Rapporter feil
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {!loading && !off && !err && (
            <View style={styles.waitingContainer}>
              <Text style={[styles.waitingText, { color: isDark ? "#ccc" : "#666" }]}>
                Vent på at produktdata blir hentet...
              </Text>
            </View>
          )}

          {/* Debug/Status display - only in dev mode */}
          {DEV_MODE && (
            <View style={[styles.debugContainer, { backgroundColor: isDark ? "#1a1a1a" : "#f0f0f0" }]}>
              <Text style={[styles.debugTitle, { color: isDark ? "#888" : "#666" }]}>
                Debug:
              </Text>
              <Text style={[styles.debugText, { color: isDark ? "#888" : "#666" }]}>
                OFF status: {off?.status !== undefined ? off.status : "Ikke hentet"} | 
                Ingrediens lengde: {finalIngredientsText.length} tegn
              </Text>
              {err && (
                <Text style={[styles.debugText, { color: "red" }]}>
                  Feil: {err}
                </Text>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
            onPress={() => {
              setBarcode("");
              setOff(null);
              setErr(null);
              setScanned(false);
            }}
          >
            <Text style={[styles.scanButtonText, { color: isDark ? "#fff" : "#000" }]}>
              Scan nytt produkt
            </Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    marginVertical: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#ffe6e6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorTitle: {
    color: "red",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  errorText: {
    color: "red",
    fontSize: 14,
  },
  notFoundContainer: {
    backgroundColor: "#fff3cd",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  notFoundSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  notFoundDescription: {
    fontSize: 12,
    color: "#666",
  },
  productHeader: {
    marginBottom: 20,
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 12,
  },
  favoriteButtonText: {
    fontSize: 32,
    color: "#ffaa00",
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  brandText: {
    fontSize: 16,
    marginTop: 4,
  },
  warningContainer: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
  },
  upfContainer: {
    marginBottom: 20,
  },
  upfTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  upfScoreBox: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  upfLevel: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  upfScore: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },
  whyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  signalsList: {
    marginTop: 8,
  },
  signalItem: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  noSignals: {
    fontSize: 14,
    fontStyle: "italic",
  },
  ingredientsContainer: {
    marginBottom: 20,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  ingredientsScrollView: {
    maxHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  ingredientsScrollContent: {
    padding: 12,
  },
  ingredientsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  missingIngredientsContainer: {
    backgroundColor: "#fff3cd",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  missingIngredientsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  missingIngredientsText: {
    fontSize: 14,
    color: "#666",
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 16,
    marginBottom: 8,
  },
  waitingContainer: {
    padding: 24,
    alignItems: "center",
  },
  waitingText: {
    fontSize: 14,
  },
  debugContainer: {
    padding: 8,
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  debugText: {
    fontSize: 10,
  },
  allergyContainer: {
    marginBottom: 20,
  },
  allergyBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  allergyBoxContains: {
    backgroundColor: "#ffe6e6",
    borderLeftWidth: 4,
    borderLeftColor: "#ff4444",
  },
  allergyBoxMayContain: {
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ffaa00",
  },
  allergyBoxTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  allergyBoxText: {
    fontSize: 14,
    lineHeight: 20,
  },
  allergySafe: {
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 8,
  },
  allergenSection: {
    marginBottom: 20,
  },
  allergenSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  allergenBox: {
    padding: 12,
    borderRadius: 8,
  },
  allergenBoxFound: {
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ffaa00",
  },
  allergenBoxTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#856404",
  },
  allergenBoxText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#856404",
  },
  allergenText: {
    fontSize: 14,
    lineHeight: 20,
  },
  allergyDisclaimer: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
  explanationButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  explanationButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    fontWeight: "300",
  },
  modalScroll: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
  },
  scanButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  reportButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
