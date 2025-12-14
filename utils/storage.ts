import AsyncStorage from '@react-native-async-storage/async-storage';

export type HistoryItem = {
  barcode: string;
  product_name: string;
  brands?: string;
  upfLevel: "Grønn" | "Gul" | "Rød";
  score: number;
  scannedAt: number; // timestamp
};

export type FavoriteItem = {
  barcode: string;
  product_name: string;
  brands?: string;
  upfLevel: "Grønn" | "Gul" | "Rød";
  score: number;
};

const HISTORY_KEY = 'scan_history';
const FAVORITES_KEY = 'favorites';
const ALLERGY_PREFS_KEY = 'allergyPrefs';
const MAX_HISTORY = 50;

export type AllergyType = 
  | 'gluten'
  | 'melk'
  | 'egg'
  | 'soya'
  | 'nøtter'
  | 'peanøtter'
  | 'sesam'
  | 'fisk'
  | 'skalldyr'
  | 'sennep';

export type AllergyPreferences = {
  [key in AllergyType]: boolean;
};

// History functions
export async function saveToHistory(item: HistoryItem): Promise<void> {
  try {
    const history = await getHistory();
    
    // Remove existing item with same barcode
    const filtered = history.filter(h => h.barcode !== item.barcode);
    
    // Add new item at the beginning
    const updated = [item, ...filtered].slice(0, MAX_HISTORY);
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

// Favorites functions
export async function getFavorites(): Promise<FavoriteItem[]> {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function addToFavorites(item: FavoriteItem): Promise<void> {
  try {
    const favorites = await getFavorites();
    
    // Check if already exists
    if (favorites.some(f => f.barcode === item.barcode)) {
      return;
    }
    
    favorites.push(item);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
}

export async function removeFromFavorites(barcode: string): Promise<void> {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter(f => f.barcode !== barcode);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
}

export async function isFavorite(barcode: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.some(f => f.barcode === barcode);
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
}

export async function toggleFavorite(item: FavoriteItem): Promise<boolean> {
  try {
    const isFav = await isFavorite(item.barcode);
    if (isFav) {
      await removeFromFavorites(item.barcode);
      return false;
    } else {
      await addToFavorites(item);
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
}

// Allergy preferences functions
export async function getAllergyPreferences(): Promise<AllergyPreferences> {
  try {
    const data = await AsyncStorage.getItem(ALLERGY_PREFS_KEY);
    if (!data) {
      // Return default (all false)
      return {
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
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting allergy preferences:', error);
    return {
      gluten: false,
      melk: false,
      egg: false,
      soya: false,
      nøtter: false,
      peanøtter: false,
      sesam: false,
      fisk: false,
      skalldyr: false,
    };
  }
}

export async function saveAllergyPreferences(prefs: AllergyPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(ALLERGY_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving allergy preferences:', error);
  }
}

