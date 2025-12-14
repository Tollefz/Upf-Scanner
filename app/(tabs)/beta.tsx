import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getHistory, getFavorites, getAllergyPreferences, clearHistory } from '@/utils/storage';
import Constants from 'expo-constants';

const APP_VERSION = '0.1.0-beta';

export default function BetaScreen() {
  const [historyCount, setHistoryCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [activeAllergiesCount, setActiveAllergiesCount] = useState(0);
  const [offTestStatus, setOffTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [offTestError, setOffTestError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const loadStats = async () => {
    const [history, favorites, allergies] = await Promise.all([
      getHistory(),
      getFavorites(),
      getAllergyPreferences(),
    ]);
    setHistoryCount(history.length);
    setFavoritesCount(favorites.length);
    setActiveAllergiesCount(Object.values(allergies).filter(v => v).length);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleResetData = () => {
    Alert.alert(
      'Reset lokaldata',
      'Dette vil slette all historikk, favoritter og allergipreferanser. Er du sikker?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['scan_history', 'favorites', 'allergyPrefs']);
              await loadStats();
              Alert.alert('Suksess', 'Lokaldata er slettet');
            } catch (error) {
              Alert.alert('Feil', 'Kunne ikke slette data');
            }
          },
        },
      ]
    );
  };

  const handleTestOffConnection = async () => {
    setOffTestStatus('testing');
    setOffTestError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        'https://world.openfoodfacts.org/api/v2/product/3017620422003.json',
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      await response.json();
      setOffTestStatus('ok');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setOffTestError('Timeout (10 sek)');
      } else {
        setOffTestError(error.message || 'Ukjent feil');
      }
      setOffTestStatus('error');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
      contentContainerStyle={styles.content}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Beta / Diagnose</ThemedText>
      </ThemedView>

      {/* App version */}
      <View style={[styles.section, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          App-versjon
        </Text>
        <Text style={[styles.sectionText, { color: isDark ? "#ccc" : "#666" }]}>
          {APP_VERSION}
        </Text>
      </View>

      {/* Statistics */}
      <View style={[styles.section, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          Statistikk
        </Text>
        <Text style={[styles.sectionText, { color: isDark ? "#ccc" : "#666" }]}>
          Historikk: {historyCount} produkter
        </Text>
        <Text style={[styles.sectionText, { color: isDark ? "#ccc" : "#666" }]}>
          Favoritter: {favoritesCount} produkter
        </Text>
        <Text style={[styles.sectionText, { color: isDark ? "#ccc" : "#666" }]}>
          Aktive allergipreferanser: {activeAllergiesCount}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
          onPress={handleResetData}
        >
          <Text style={[styles.actionButtonText, { color: isDark ? "#fff" : "#000" }]}>
            Reset lokaldata
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" },
            offTestStatus === 'testing' && styles.actionButtonDisabled
          ]}
          onPress={handleTestOffConnection}
          disabled={offTestStatus === 'testing'}
        >
          <Text style={[styles.actionButtonText, { color: isDark ? "#fff" : "#000" }]}>
            {offTestStatus === 'testing' ? 'Tester...' : 'Test OFF-tilkobling'}
          </Text>
        </TouchableOpacity>

        {offTestStatus === 'ok' && (
          <View style={[styles.statusBox, { backgroundColor: "#d4edda" }]}>
            <Text style={[styles.statusText, { color: "#155724" }]}>✓ OK - Tilkobling fungerer</Text>
          </View>
        )}

        {offTestStatus === 'error' && (
          <View style={[styles.statusBox, { backgroundColor: "#f8d7da" }]}>
            <Text style={[styles.statusText, { color: "#721c24" }]}>
              ✗ Feil: {offTestError || 'Ukjent feil'}
            </Text>
          </View>
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

