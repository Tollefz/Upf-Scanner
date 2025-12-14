import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Text, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getHistory, getFavorites, type HistoryItem, type FavoriteItem } from '@/utils/storage';

export default function ExploreScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const loadData = async () => {
    const [hist, favs] = await Promise.all([getHistory(), getFavorites()]);
    setHistory(hist);
    setFavorites(favs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getLevelColor = (level: "Grønn" | "Gul" | "Rød") => {
    return level === "Rød" ? "#ff4444" : level === "Gul" ? "#ffaa00" : "#44ff44";
  };

  const getLevelText = (level: "Grønn" | "Gul" | "Rød") => {
    return level === "Rød" ? "Sannsynlig ultraprosessert" :
           level === "Gul" ? "Mulig ultraprosessert" :
           "Lite sannsynlig ultraprosessert";
  };

  const navigateToProduct = (barcode: string) => {
    // Navigate to scanner with barcode pre-filled
    router.push({
      pathname: '/(tabs)/index',
      params: { barcode },
    });
  };

  const renderProductRow = (item: HistoryItem | FavoriteItem, isHistory: boolean) => {
    const levelColor = getLevelColor(item.upfLevel);
    const levelText = getLevelText(item.upfLevel);

    return (
      <TouchableOpacity
        key={item.barcode}
        style={[
          styles.productRow,
          { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }
        ]}
        onPress={() => navigateToProduct(item.barcode)}
      >
        <View style={styles.productRowContent}>
          <View style={styles.productRowLeft}>
            <Text
              style={[styles.productRowName, { color: isDark ? "#fff" : "#000" }]}
              numberOfLines={2}
            >
              {item.product_name}
            </Text>
            {item.brands && (
              <Text style={[styles.productRowBrand, { color: isDark ? "#ccc" : "#666" }]}>
                {item.brands}
              </Text>
            )}
            {isHistory && 'scannedAt' in item && (
              <Text style={[styles.productRowDate, { color: isDark ? "#888" : "#999" }]}>
                {new Date(item.scannedAt).toLocaleDateString('no-NO', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
          <View style={styles.productRowRight}>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: levelColor }
              ]}
            >
              <Text style={styles.levelBadgeText}>{item.score}/100</Text>
            </View>
            <Text style={[styles.levelText, { color: isDark ? "#ccc" : "#666" }]}>
              {levelText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Historikk</ThemedText>
      </ThemedView>

      {/* Allergies button */}
      <TouchableOpacity
        style={[
          styles.allergiesButton,
          { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }
        ]}
        onPress={() => router.push('/(tabs)/allergies')}
      >
        <Text style={[styles.allergiesButtonText, { color: isDark ? "#fff" : "#000" }]}>
          Allergier
        </Text>
        <Text style={[styles.allergiesButtonArrow, { color: isDark ? "#888" : "#666" }]}>
          →
        </Text>
      </TouchableOpacity>

      {/* Beta/Diagnose button */}
      <TouchableOpacity
        style={[
          styles.allergiesButton,
          { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }
        ]}
        onPress={() => router.push('/(tabs)/beta')}
      >
        <Text style={[styles.allergiesButtonText, { color: isDark ? "#fff" : "#000" }]}>
          Beta / Diagnose
        </Text>
        <Text style={[styles.allergiesButtonArrow, { color: isDark ? "#888" : "#666" }]}>
          →
        </Text>
      </TouchableOpacity>

      {/* Favorites Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          Favoritter
        </Text>
        {favorites.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
            Ingen favoritter ennå
          </Text>
        ) : (
          favorites.map((item) => renderProductRow(item, false))
        )}
      </View>

      {/* History Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          Sist scannet
        </Text>
        {history.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
            Ingen scannet historikk ennå
          </Text>
        ) : (
          history.map((item) => renderProductRow(item, true))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  titleContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  productRow: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productRowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  productRowName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productRowBrand: {
    fontSize: 14,
    marginBottom: 4,
  },
  productRowDate: {
    fontSize: 12,
  },
  productRowRight: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  levelBadgeText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  levelText: {
    fontSize: 11,
    textAlign: 'right',
  },
  allergiesButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  allergiesButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  allergiesButtonArrow: {
    fontSize: 18,
  },
});
