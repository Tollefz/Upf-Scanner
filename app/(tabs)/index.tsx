import { useColorScheme } from "@/hooks/use-color-scheme";
import { detectAllergens } from "@/utils/allergen-detection";
import { checkAllergies } from "@/utils/allergy-check";
import { queueProductReport, type IssueType } from "@/utils/product-reporting";
import { addUnknownBarcode, logScanEvent, type ScanResultStatus } from "@/utils/scan-logging";
import { getAllergyPreferences, isFavorite, saveToHistory, toggleFavorite, type AllergyPreferences, type FavoriteItem } from "@/utils/storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Button, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// Development flag - set to false in production
const DEV_MODE = __DEV__;

// Feature flags for v1/v2/v3 releases
// v1 FOCUS: Signal, ikke features. Skjul alt som kan forvirre eller gi bugs.
const FEATURES = {
  // v1: Basic reporting (NOT_FOUND only) - ABSOLUTT MUST
  REPORT_NOT_FOUND: true,
  REPORT_NETWORK_ERROR: false, // Skjul i v1 - fokus på NOT_FOUND
  
  // v2: Missing data reporting
  REPORT_MISSING_DATA: false, // Enable in v2
  
  // v3: OCR and manual entry - IKKE i v1!
  OCR_ENABLED: false, // IKKE gjør før fredag
  MANUAL_ENTRY_ENABLED: false, // IKKE gjør før fredag
};

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

// Error types for better error handling
type ScanError = 
  | { type: 'not_found'; message: string }
  | { type: 'network_error'; message: string; retryable: boolean }
  | { type: 'timeout'; message: string }
  | { type: 'unknown_error'; message: string };

// Scan result state - eksplisitte states som ALDRI blandes
type ScanState = 
  | { type: 'idle' }
  | { type: 'scanning'; detectedBarcodes: string[] } // Multi-frame validation
  | { type: 'scan_error'; message: string; suggestions: string[] } // Barcode ikke lest stabilt
  | { type: 'loading'; barcode: string; barcodeType?: string } // Barcode bekreftet, lookup pågår
  | { type: 'found'; barcode: string; barcodeType?: string; product: OffProduct; ingredientsText: string; dataSource: 'openfoodfacts' | 'ocr' | 'manual'; latencyMs?: number }
  | { type: 'not_found'; barcode: string; barcodeType?: string; latencyMs?: number } // 404 eller status=0 - produkt finnes IKKE i DB
  | { type: 'missing_data'; barcode: string; barcodeType?: string; product: OffProduct; latencyMs?: number } // Produkt funnet, men mangler ingredienser
  | { type: 'network_error'; barcode: string; barcodeType?: string; message: string; retryable: boolean; latencyMs?: number }; // Timeout/5xx/offline - IKKE not found

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

async function fetchOffProduct(barcode: string, retryCount = 0): Promise<{ response: OffResponse; error?: ScanError }> {
  const startTime = Date.now();
  
  // Check cache first
  const cached = offCache.get(barcode);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const latency = Date.now() - startTime;
    return { response: cached.data };
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}.json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Handle HTTP errors
    if (res.status === 404) {
      return {
        response: { status: 0, code: barcode },
        error: { type: 'not_found', message: 'Produktet finnes ikke i databasen' }
      };
    }

    if (res.status >= 500) {
      return {
        response: { status: 0, code: barcode },
        error: { 
          type: 'network_error', 
          message: 'Serverfeil - prøv igjen senere',
          retryable: true
        }
      };
    }

    if (!res.ok) {
      return {
        response: { status: 0, code: barcode },
        error: { 
          type: 'network_error', 
          message: `Kunne ikke hente produkt (HTTP ${res.status})`,
          retryable: res.status >= 500 || res.status === 408
        }
      };
    }

    const data = (await res.json()) as OffResponse;
    
    // Cache the result
    offCache.set(barcode, { data, timestamp: Date.now() });
    
    return { response: data };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        response: { status: 0, code: barcode },
        error: { 
          type: 'timeout', 
          message: 'Tidsavbrudd - Open Food Facts svarte ikke i tide. Prøv igjen.'
        }
      };
    }

    // Network errors (no connection, DNS failure, etc.)
    if (error.message?.includes('Network') || error.message?.includes('network') || 
        error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      return {
        response: { status: 0, code: barcode },
        error: { 
          type: 'network_error', 
          message: 'Kunne ikke kontakte databasen. Sjekk internettforbindelsen og prøv igjen.',
          retryable: true
        }
      };
    }

    return {
      response: { status: 0, code: barcode },
      error: { 
        type: 'unknown_error', 
        message: error?.message || 'Ukjent feil oppstod'
      }
    };
  }
}

// IMPORTANT: Do not add hooks conditionally. Keep hook order stable.
// All hooks must be declared at the top level before any early returns.
// This ensures React can track hook order correctly across renders.
export default function Index() {
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanState, setScanState] = useState<ScanState>({ type: 'idle' });
  const [isFav, setIsFav] = useState(false);
  const [showUpfExplanation, setShowUpfExplanation] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualProductName, setManualProductName] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");
  const [ocrIngredients, setOcrIngredients] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  // Toast state for superrask rapportering
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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

  // Multi-frame barcode validation state
  const [barcodeReads, setBarcodeReads] = useState<Map<string, number>>(new Map());
  const [barcodeValidationTimer, setBarcodeValidationTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lastBarcodeRead, setLastBarcodeRead] = useState<string | null>(null);

  // Get current barcode from state
  const barcode = scanState.type === 'idle' ? "" : 
                  scanState.type === 'scanning' ? (scanState.detectedBarcodes[0] || "") :
                  scanState.type === 'loading' ? scanState.barcode :
                  scanState.type === 'scan_error' ? "" :
                  scanState.barcode || "";
  
  const loading = scanState.type === 'loading';

  // Detect barcode type from barcode string
  const detectBarcodeType = useCallback((barcode: string): string => {
    if (barcode.length === 13) return 'EAN13';
    if (barcode.length === 8) return 'EAN8';
    if (barcode.length === 12) return 'UPC';
    if (barcode.length >= 8 && barcode.length <= 20) return 'CODE128';
    return 'UNKNOWN';
  }, []);

  // Main function to handle barcode scanning (after validation) - defined first
  const handleBarcodeScan = useCallback(async (scannedBarcode: string, barcodeType: string) => {
    setScanned(true);
    // Show confirmed barcode before lookup
    setScanState({ type: 'loading', barcode: scannedBarcode, barcodeType });
    
    const startTime = Date.now();
    
    try {
      const result = await fetchOffProduct(scannedBarcode);
      const latency = Date.now() - startTime;
      
      if (result.error) {
        // CRITICAL: 404 ≠ network error, timeout ≠ not found
        if (result.error.type === 'not_found') {
          // 404 or status=0 - produkt finnes IKKE i databasen
          await addUnknownBarcode(scannedBarcode);
          await logScanEvent({
            barcode: scannedBarcode,
            status: 'not_found',
            latency,
            timestamp: Date.now(),
            dataSource: 'openfoodfacts',
            hasIngredients: false,
          });
          setScanState({ type: 'not_found', barcode: scannedBarcode, barcodeType });
        } else {
          // Network/timeout errors - IKKE not found
          const status: ScanResultStatus = result.error.type === 'timeout' ? 'timeout' : 'network_error';
          await logScanEvent({
            barcode: scannedBarcode,
            status,
            latency,
            timestamp: Date.now(),
            dataSource: 'openfoodfacts',
            hasIngredients: false,
          });
          setScanState({ 
            type: 'network_error', 
            barcode: scannedBarcode,
            barcodeType,
            message: result.error.message,
            retryable: result.error.type === 'network_error' ? result.error.retryable : result.error.type === 'timeout'
          });
        }
        return;
      }

      const off = result.response;
      
      // Check if product was found
      if (off.status === 0) {
        // NOT_FOUND - produkt finnes ikke i DB
        await addUnknownBarcode(scannedBarcode);
        await logScanEvent({
          barcode: scannedBarcode,
          status: 'not_found',
          latency,
          timestamp: Date.now(),
          dataSource: 'openfoodfacts',
          hasIngredients: false,
        });
        setScanState({ type: 'not_found', barcode: scannedBarcode, barcodeType });
        return;
      }

      if (!off.product) {
        // NOT_FOUND - ingen produktdata
        await addUnknownBarcode(scannedBarcode);
        await logScanEvent({
          barcode: scannedBarcode,
          status: 'not_found',
          latency,
          timestamp: Date.now(),
          dataSource: 'openfoodfacts',
          hasIngredients: false,
        });
        setScanState({ type: 'not_found', barcode: scannedBarcode, barcodeType });
        return;
      }

      // Check for ingredients
      const ingredientsText = 
        off.product.ingredients_text_da ||
        off.product.ingredients_text ||
        off.product.ingredients_text_en ||
        (off.product.ingredients && Array.isArray(off.product.ingredients)
          ? off.product.ingredients.map((ing) => ing.text).filter(Boolean).join(", ")
          : "") ||
        "";

      const hasIngredients = ingredientsText.length >= 15;

      if (!hasIngredients) {
        // MISSING_DATA - produkt funnet, men mangler ingredienser
        await logScanEvent({
          barcode: scannedBarcode,
          status: 'missing_ingredients', // Use 'missing_ingredients' for logging compatibility
          latency,
          timestamp: Date.now(),
          dataSource: 'openfoodfacts',
          hasIngredients: false,
          productName: off.product.product_name,
        });
        setScanState({ 
          type: 'missing_data', 
          barcode: scannedBarcode,
          barcodeType,
          product: off.product 
        });
        return;
      }

      // FOUND - produkt funnet med nok data
      await logScanEvent({
        barcode: scannedBarcode,
        status: 'found',
        latency,
        timestamp: Date.now(),
        dataSource: 'openfoodfacts',
        hasIngredients: true,
        ingredientsLength: ingredientsText.length,
        productName: off.product.product_name,
      });
      
      setScanState({ 
        type: 'found', 
        barcode: scannedBarcode,
        barcodeType,
        product: off.product,
        ingredientsText,
        dataSource: 'openfoodfacts'
      });
    } catch (error: any) {
      const latency = Date.now() - startTime;
      await logScanEvent({
        barcode: scannedBarcode,
        status: 'unknown_error',
        latency,
        timestamp: Date.now(),
        dataSource: 'openfoodfacts',
        hasIngredients: false,
      });
      setScanState({ 
        type: 'network_error', 
        barcode: scannedBarcode,
        barcodeType,
        message: error?.message || 'Ukendt fejl opstod',
        retryable: true
      });
    }
  }, []);

  // Validate barcode after collection period
  const validateBarcode = useCallback(() => {
    setBarcodeReads(currentReads => {
      if (currentReads.size === 0) {
        setScanState({ type: 'idle' });
        return new Map();
      }

      // Find most frequent barcode
      let maxCount = 0;
      let mostFrequentBarcode = '';
      let totalReads = 0;

      currentReads.forEach((count, barcode) => {
        totalReads += count;
        if (count > maxCount) {
          maxCount = count;
          mostFrequentBarcode = barcode;
        }
      });

      // Validation rules:
      // - Most frequent barcode must appear at least 3 times
      // - Most frequent must be at least 60% of total reads
      const percentage = (maxCount / totalReads) * 100;

      if (maxCount >= 3 && percentage >= 60) {
        // Valid barcode - proceed with lookup
        const barcodeType = detectBarcodeType(mostFrequentBarcode);
        handleBarcodeScan(mostFrequentBarcode, barcodeType);
      } else if (totalReads >= 3) {
        // Multiple different barcodes detected - scan error
        setScanState({
          type: 'scan_error',
          message: 'Stregkoden blev ikke læst stabilt',
          suggestions: [
            'Flyt tættere på',
            'Bedre lys',
            'Hold stregkoden i ro'
          ]
        });
        setScanned(false);
      } else {
        // Not enough reads yet - reset to idle
        setScanState({ type: 'idle' });
      }

      // Clear reads
      setBarcodeValidationTimer(null);
      return new Map();
    });
  }, [detectBarcodeType, handleBarcodeScan]);

  // Multi-frame barcode validation
  const handleBarcodeDetected = useCallback((detectedBarcode: string) => {
    // Normalize barcode (preserve leading zeros)
    const normalized = detectedBarcode.trim();
    if (!normalized) return;

    setLastBarcodeRead(normalized);
    
    // Set scanning state if not already
    setScanState(prev => {
      if (prev.type === 'idle') {
        return { type: 'scanning', detectedBarcodes: [normalized] };
      }
      if (prev.type === 'scanning') {
        const unique = new Set([...prev.detectedBarcodes, normalized]);
        return { type: 'scanning', detectedBarcodes: Array.from(unique) };
      }
      return prev;
    });
    
    // Update read counts
    setBarcodeReads(prev => {
      const updated = new Map(prev);
      updated.set(normalized, (updated.get(normalized) || 0) + 1);
      return updated;
    });

    // Reset validation timer
    if (barcodeValidationTimer) {
      clearTimeout(barcodeValidationTimer);
    }

    // Start validation window (1.5 seconds)
    const timer = setTimeout(() => {
      validateBarcode();
    }, 1500);
    setBarcodeValidationTimer(timer);
  }, [barcodeValidationTimer, validateBarcode]);

  // Handle barcode from params (when navigating from history)
  useEffect(() => {
    if (params.barcode && typeof params.barcode === 'string') {
      const barcodeType = detectBarcodeType(params.barcode);
      handleBarcodeScan(params.barcode, barcodeType);
    }
  }, [params.barcode, detectBarcodeType]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (barcodeValidationTimer) {
        clearTimeout(barcodeValidationTimer);
      }
    };
  }, [barcodeValidationTimer, validateBarcode]);

  // Get ingredients text from current state
  const finalIngredientsText = useMemo(() => {
    if (scanState.type === 'found') {
      return scanState.ingredientsText;
    }
    if (scanState.type === 'missing_data') {
      // Try to get from product if available
      const textFromFields =
        scanState.product.ingredients_text_da ||
        scanState.product.ingredients_text ||
        scanState.product.ingredients_text_en ||
        "";
      if (textFromFields && textFromFields.length >= 15) return textFromFields;
      
      // Try OCR or manual entry
      if (ocrIngredients && ocrIngredients.length >= 15) return ocrIngredients;
      if (manualIngredients && manualIngredients.length >= 15) return manualIngredients;
      
      return textFromFields;
    }
    return "";
  }, [scanState, ocrIngredients, manualIngredients]);

  // Get product from current state
  const off = useMemo(() => {
    if (scanState.type === 'found' || scanState.type === 'missing_data') {
      return {
        status: 1 as const,
        code: scanState.barcode,
        product: scanState.product,
      };
    }
    return null;
  }, [scanState]);

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
    const product = scanState.type === 'found' || scanState.type === 'missing_data' 
      ? scanState.product 
      : undefined;
    
    if (!product) {
      // Even without product, check if we have ingredients text
      return checkAllergies(undefined, finalIngredientsText, allergyPrefs);
    }
    return checkAllergies(product, finalIngredientsText, allergyPrefs);
  }, [scanState, finalIngredientsText, allergyPrefs]);

  // General allergen detection (separate from user preferences)
  const allergenDetection = useMemo(() => {
    return detectAllergens(finalIngredientsText);
  }, [finalIngredientsText]);

  const handleRetry = useCallback(() => {
    if (barcode && (scanState.type === 'network_error' || scanState.type === 'not_found' || scanState.type === 'missing_data')) {
      const barcodeType = scanState.barcodeType || detectBarcodeType(barcode);
      handleBarcodeScan(barcode, barcodeType);
    }
  }, [barcode, scanState, detectBarcodeType, handleBarcodeScan]);

  // Check favorite status when product is loaded
  useEffect(() => {
    if (barcode && scanState.type === 'found') {
      (async () => {
        const fav = await isFavorite(barcode);
        setIsFav(fav);
      })();
    }
  }, [barcode, scanState]);

  // Save to history when product is successfully scanned
  useEffect(() => {
    if (scanState.type === 'found' && upf && barcode && !loading) {
      (async () => {
        await saveToHistory({
          barcode,
          product_name: scanState.product.product_name || "Ukjent navn",
          brands: scanState.product.brands,
          upfLevel: upf.level,
          score: upf.score,
          scannedAt: Date.now(),
        });
      })();
    }
  }, [scanState, upf, barcode, loading]);

  // IMPORTANT: All hooks must be declared before any early returns to maintain stable hook order
  // Handle OCR (placeholder - can be enhanced with actual OCR library)
  const handleOcrScan = useCallback(async () => {
    // TODO: Implement actual OCR using expo-image-picker + OCR library
    // For now, show a text input as placeholder
    Alert.alert(
      "OCR-funksjon",
      "OCR-funksjonen vil være tilgjengelig i neste versjon. Du kan legge inn ingredienser manuelt i mellomtiden.",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Legg inn manuelt", 
          onPress: () => {
            setShowOcrModal(false);
            setShowManualEntryModal(true);
          }
        }
      ]
    );
  }, []);

  // Handle manual entry submission
  const handleManualEntrySubmit = useCallback(async () => {
    if (!manualProductName.trim() || !manualIngredients.trim()) {
      Alert.alert("Mangler informasjon", "Vennligst fyll inn både produktnavn og ingredienser.");
      return;
    }

    if (scanState.type === 'missing_data' || scanState.type === 'not_found') {
      setOcrIngredients(null); // Clear OCR if any
      setManualIngredients(manualIngredients.trim());
      
      // Update state to found with manual data
      if (scanState.type === 'missing_data') {
        setScanState({
          type: 'found',
          barcode: scanState.barcode,
          product: {
            ...scanState.product,
            product_name: manualProductName.trim(),
          },
          ingredientsText: manualIngredients.trim(),
          dataSource: 'manual',
        });
      } else {
        // For not_found, create a minimal product
        setScanState({
          type: 'found',
          barcode: scanState.barcode,
          product: {
            product_name: manualProductName.trim(),
          },
          ingredientsText: manualIngredients.trim(),
          dataSource: 'manual',
        });
      }

      // Log the manual entry
      await logScanEvent({
        barcode: scanState.barcode,
        status: 'found',
        latency: 0,
        timestamp: Date.now(),
        dataSource: 'manual',
        hasIngredients: true,
        ingredientsLength: manualIngredients.trim().length,
        productName: manualProductName.trim(),
      });

      setShowManualEntryModal(false);
      setManualProductName("");
      setManualIngredients("");
    }
  }, [manualProductName, manualIngredients, scanState]);

  // Request image picker permissions
  const requestImagePickerPermission = useCallback(async () => {
    if (Constants.platform?.ios) {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Tilladelse nødvendig',
          'Vi har brug for adgang til billeder for at kunne vedhæfte et billede af produktet.'
        );
        return false;
      }
    }
    return true;
  }, []);

  // Show toast and auto-hide after 2 seconds, then auto-return to scanning
  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      // Automatisk tilbake til scanning etter toast
      setScanState({ type: 'idle' });
      setScanned(false);
      setBarcodeReads(new Map());
    }, 2000);
  }, []);

  // Handle report product - SUPERRAST: ett trykk, ingen modal, automatisk tilbake
  const handleReportProduct = useCallback(async () => {
    if (!barcode) return;

    setIsReporting(true);

    try {
      const issueType: IssueType = 
        scanState.type === 'not_found' 
          ? 'NOT_FOUND' 
          : scanState.type === 'missing_data'
          ? 'MISSING_INGREDIENTS'
          : scanState.type === 'network_error'
          ? 'LOOKUP_ERROR'
          : 'LOOKUP_ERROR';

      // Determine error details
      const httpStatus = scanState.type === 'network_error' ? 500 : 
                        scanState.type === 'not_found' ? 404 : undefined;
      const errorCode = scanState.type === 'network_error' 
        ? 'network_error'
        : undefined;

      // Queue report (will try to send immediately) - ingen bilde, ingen note i v1
      const reportId = await queueProductReport(
        barcode,
        issueType,
        {
          productName: scanState.type === 'missing_data' 
            ? scanState.product?.product_name 
            : undefined,
          lookupSource: 'openfoodfacts',
          httpStatus,
          errorCode,
          // v1: Ingen userNote eller productPhotoBase64 - superrask!
          latencyMs: (scanState.type === 'not_found' || scanState.type === 'missing_data' || scanState.type === 'network_error') 
            ? scanState.latencyMs 
            : undefined, // Include latency from lookup (usynlig for bruker)
        }
      );

      // Also add to unknown barcodes queue
      if (issueType === 'NOT_FOUND') {
        await addUnknownBarcode(barcode);
      }

      // Toast: "Rapport sendt" - automatisk tilbake til scanning
      showToastMessage("Rapport sendt");
    } catch (error) {
      console.error('Error reporting product:', error);
      // Toast også ved feil - men fortsatt automatisk tilbake
      showToastMessage("Rapport gemt (sendes senere)");
    } finally {
      setIsReporting(false);
    }
  }, [barcode, scanState, showToastMessage]);

  // Early returns AFTER all hooks are declared
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
      {scanState.type === 'idle' || scanState.type === 'scanning' ? (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
            }}
            onBarcodeScanned={
              scanned
                ? undefined
                : (result) => {
                    handleBarcodeDetected(result.data);
                  }
            }
          />
          {/* Show scanning state with detected barcodes */}
          {scanState.type === 'scanning' && scanState.detectedBarcodes.length > 0 && (
            <View style={[styles.scanningOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>
              <Text style={[styles.scanningText, { color: isDark ? '#fff' : '#000' }]}>
                Læser stregkode...
              </Text>
              <Text style={[styles.scanningBarcode, { color: isDark ? '#ccc' : '#666' }]}>
                {scanState.detectedBarcodes[0]}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { backgroundColor: isDark ? "#000" : "#fff" }]}
          style={styles.scrollView}
        >
          {/* Scan Error State */}
          {scanState.type === 'scan_error' && (
            <View style={styles.scanErrorContainer}>
              <Text style={styles.scanErrorTitle}>
                Stregkoden blev ikke læst stabilt
              </Text>
              <Text style={styles.scanErrorText}>
                {scanState.message}
              </Text>
              <View style={styles.suggestionsContainer}>
                {scanState.suggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>
                    • {suggestion}
                  </Text>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                onPress={() => {
                  setScanState({ type: 'idle' });
                  setScanned(false);
                  setBarcodeReads(new Map());
                  setLastBarcodeRead(null);
                }}
              >
                <Text style={[styles.retryButtonText, { color: isDark ? "#fff" : "#000" }]}>
                  Prøv igen
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading State - Show confirmed barcode */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={[styles.loadingText, { color: isDark ? "#fff" : "#000" }]}>
                Skannet: {barcode}
              </Text>
              {scanState.barcodeType && (
                <Text style={[styles.loadingBarcodeType, { color: isDark ? "#888" : "#666" }]}>
                  Type: {scanState.barcodeType}
                </Text>
              )}
              <Text style={[styles.loadingSubtext, { color: isDark ? "#ccc" : "#666" }]}>
                Søger efter produkt…
              </Text>
            </View>
          )}

          {/* Network Error State - IKKE not found */}
          {scanState.type === 'network_error' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Kunne ikke hente data</Text>
              <Text style={styles.errorDescription}>
                Tjek din internetforbindelse og prøv igen.
              </Text>
              {barcode && (
                <Text style={[styles.scannedBarcodeDisplay, { color: isDark ? "#888" : "#666" }]}>
                  Skannet: {barcode} {scanState.barcodeType ? `(${scanState.barcodeType})` : ''}
                </Text>
              )}
              {scanState.retryable && (
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                  onPress={handleRetry}
                >
                  <Text style={[styles.retryButtonText, { color: isDark ? "#fff" : "#000" }]}>
                    Prøv igen
                  </Text>
                </TouchableOpacity>
              )}
              {FEATURES.REPORT_NETWORK_ERROR && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5", marginTop: 8 }]}
                  onPress={handleReportProduct}
                >
                  <Text style={[styles.secondaryButtonText, { color: isDark ? "#fff" : "#000" }]}>
                    Rapportér problem
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5", marginTop: 8 }]}
                onPress={() => {
                  setScanState({ type: 'idle' });
                  setScanned(false);
                  setBarcodeReads(new Map());
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: isDark ? "#fff" : "#000" }]}>
                  Scan igen
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Not Found State - 404 eller status=0, IKKE network error */}
          {scanState.type === 'not_found' && (
            <View style={styles.notFoundContainer}>
              <Text style={styles.notFoundTitle}>
                Produktet blev ikke fundet
              </Text>
              <Text style={[styles.scannedBarcodeDisplay, { color: isDark ? "#888" : "#666", marginBottom: 8 }]}>
                Skannet: {barcode} {scanState.barcodeType ? `(${scanState.barcodeType})` : ''}
              </Text>
              <Text style={styles.notFoundDescription}>
                Vi kan ikke finde dette produkt i databasen endnu.
              </Text>
              
              <View style={styles.actionButtonsContainer}>
                {/* SUPERRAST: Stor knapp, ett trykk, ingen modal */}
                <TouchableOpacity
                  style={[styles.reportButtonLarge, { backgroundColor: isDark ? "#007AFF" : "#007AFF" }]}
                  onPress={handleReportProduct}
                  disabled={isReporting}
                >
                  {isReporting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.reportButtonLargeText}>
                      Rapportér produkt
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Missing Data State - produkt funnet, men mangler ingredienser */}
          {/* v1: Vis kun basic info, rapportering kommer i v2 - IKKE fokus i v1 */}
          {scanState.type === 'missing_data' && (
            <View style={styles.missingIngredientsContainer}>
              <Text style={styles.missingIngredientsTitle}>
                Mangler oplysninger
              </Text>
              <Text style={[styles.scannedBarcodeDisplay, { color: isDark ? "#888" : "#666", marginBottom: 8 }]}>
                Skannet: {barcode} {scanState.barcodeType ? `(${scanState.barcodeType})` : ''}
              </Text>
              {scanState.product.product_name && (
                <Text style={styles.missingIngredientsProductName}>
                  {scanState.product.product_name}
                </Text>
              )}
              <Text style={styles.missingIngredientsDescription}>
                Produktet findes, men vi mangler fx ingredienslisten for at kunne vurdere det.
              </Text>
              
              <View style={styles.actionButtonsContainer}>
                {/* v1: Ingen rapportering for MISSING_DATA - kun NOT_FOUND */}
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                  onPress={() => {
                    setScanState({ type: 'idle' });
                    setScanned(false);
                    setBarcodeReads(new Map());
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: isDark ? "#fff" : "#000" }]}>
                    Scan igen
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Found State */}
          {scanState.type === 'found' && (
            <>
              {/* Data source indicator */}
              {scanState.dataSource !== 'openfoodfacts' && (
                <View style={styles.dataSourceContainer}>
                  <Text style={styles.dataSourceText}>
                    {scanState.dataSource === 'ocr' 
                      ? "📷 Basert på bilde/OCR" 
                      : "✏️ Basert på manuell inntasting"}
                  </Text>
                </View>
              )}

              {/* Product info at top */}
              <View style={styles.productHeader}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.barcodeText, { color: isDark ? "#fff" : "#000" }]}>
                      Strekkode: {barcode}
                    </Text>
                    <Text style={[styles.productName, { color: isDark ? "#fff" : "#000" }]}>
                      {scanState.product.product_name || "Ukjent navn"}
                    </Text>
                    {!!scanState.product.brands && (
                      <Text style={[styles.brandText, { color: isDark ? "#ccc" : "#666" }]}>
                        Merke: {scanState.product.brands}
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
                            product_name: scanState.product.product_name || "Ukjent navn",
                            brands: scanState.product.brands,
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
              {scanState.type === 'found' && (
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
                  {allergyResult.status === "no_ingredients" && !scanState.product?.allergens && !scanState.product?.traces ? (
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
              {scanState.type === 'found' && (
                <TouchableOpacity
                  style={[styles.reportButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
                  onPress={async () => {
                    const reportText = [
                      `Barcode: ${barcode}`,
                      `Produktnavn: ${scanState.product?.product_name || "Ukjent"}`,
                      `Ingrediens lengde: ${finalIngredientsText.length} tegn`,
                      `UPF Score: ${upf?.score || "N/A"}/100`,
                      `UPF Nivå: ${upf?.level || "N/A"}`,
                      `Signals: ${upf?.signals.map(s => s.label).join(", ") || "Ingen"}`,
                      `Datakilde: ${scanState.dataSource}`,
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

          {/* Debug/Status display - only in dev mode */}
          {/* v1: Ingen debug UI - instrumentering er usynlig (sendes til backend) */}

          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
            onPress={() => {
              setScanState({ type: 'idle' });
              setScanned(false);
              setBarcodeReads(new Map());
              setOcrIngredients(null);
              setManualProductName("");
              setManualIngredients("");
            }}
          >
            <Text style={[styles.scanButtonText, { color: isDark ? "#fff" : "#000" }]}>
              Scan nytt produkt
            </Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* OCR Modal - Only shown if OCR_ENABLED */}
      {FEATURES.OCR_ENABLED && (
      <Modal
        visible={showOcrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOcrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>
                Skann ingrediensliste
              </Text>
              <TouchableOpacity
                onPress={() => setShowOcrModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: isDark ? "#fff" : "#000" }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.modalText, { color: isDark ? "#ccc" : "#666" }]}>
                OCR-funksjonen vil være tilgjengelig i neste versjon. Du kan legge inn ingredienser manuelt i mellomtiden.
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" }]}
                onPress={() => {
                  setShowOcrModal(false);
                  setShowManualEntryModal(true);
                }}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? "#fff" : "#000" }]}>
                  Legg inn manuelt i stedet
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      )}

      {/* Manual Entry Modal - Only shown if MANUAL_ENTRY_ENABLED */}
      {FEATURES.MANUAL_ENTRY_ENABLED && (
      <Modal
        visible={showManualEntryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualEntryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>
                Legg inn produkt manuelt
              </Text>
              <TouchableOpacity
                onPress={() => setShowManualEntryModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: isDark ? "#fff" : "#000" }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.modalLabel, { color: isDark ? "#fff" : "#000" }]}>
                Produktnavn *
              </Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
                  color: isDark ? "#fff" : "#000"
                }]}
                value={manualProductName}
                onChangeText={setManualProductName}
                placeholder="F.eks. Melkesjokolade"
                placeholderTextColor={isDark ? "#666" : "#999"}
              />
              
              <Text style={[styles.modalLabel, { color: isDark ? "#fff" : "#000", marginTop: 16 }]}>
                Ingredienser *
              </Text>
              <TextInput
                style={[styles.modalTextArea, { 
                  backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
                  color: isDark ? "#fff" : "#000"
                }]}
                value={manualIngredients}
                onChangeText={setManualIngredients}
                placeholder="F.eks. Melk, sukker, kakaosmør, kakaomasse..."
                placeholderTextColor={isDark ? "#666" : "#999"}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
                  marginTop: 24
                }]}
                onPress={handleManualEntrySubmit}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? "#fff" : "#000" }]}>
                  Lagre og beregn UPF-score
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      )}

      {/* Toast for superrask rapportering - v1: ingen modal */}
      {showToast && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* v1: Report Modal fjernet - superrask rapportering med ett trykk */}
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
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
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
    marginBottom: 8,
  },
  errorText: {
    color: "red",
    fontSize: 14,
  },
  errorDescription: {
    color: "#666",
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
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
    color: "#856404",
  },
  notFoundSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  notFoundDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButtonsContainer: {
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  secondaryButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#856404",
  },
  missingIngredientsSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  missingIngredientsProductName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  missingIngredientsText: {
    fontSize: 14,
    color: "#666",
  },
  missingIngredientsDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  dataSourceContainer: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dataSourceText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1976d2",
    textAlign: "center",
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
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalTextArea: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 120,
  },
  modalButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "600",
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
  reportImageContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  reportImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  removeImageButton: {
    marginTop: 8,
    padding: 8,
  },
  removeImageText: {
    color: "#ff4444",
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  scanningOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scanningBarcode: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  scanErrorContainer: {
    backgroundColor: "#ffe6e6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanErrorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#cc0000",
    marginBottom: 8,
  },
  scanErrorText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  suggestionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  scannedBarcodeDisplay: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 8,
  },
  loadingBarcodeType: {
    fontSize: 12,
    marginTop: 4,
  },
  // Toast styles for superrask rapportering
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Stor knapp for superrask rapportering
  reportButtonLarge: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  reportButtonLargeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
