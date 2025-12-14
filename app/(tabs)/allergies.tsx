import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Text, View, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllergyPreferences, saveAllergyPreferences, type AllergyType, type AllergyPreferences } from '@/utils/storage';
import { getAllergyDisplayName } from '@/utils/allergy-check';

const ALLERGY_TYPES: AllergyType[] = [
  'gluten',
  'melk',
  'egg',
  'soya',
  'nøtter',
  'peanøtter',
  'sesam',
  'fisk',
  'skalldyr',
  'sennep',
];

export default function AllergiesScreen() {
  const [preferences, setPreferences] = useState<AllergyPreferences>({
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
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getAllergyPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAllergy = async (allergen: AllergyType) => {
    const newPrefs = {
      ...preferences,
      [allergen]: !preferences[allergen],
    };
    setPreferences(newPrefs);
    await saveAllergyPreferences(newPrefs);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
        <Text style={{ color: isDark ? "#fff" : "#000" }}>Laster...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
      contentContainerStyle={styles.content}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Allergiinnstillinger</ThemedText>
      </ThemedView>

      <Text style={[styles.description, { color: isDark ? "#ccc" : "#666" }]}>
        Velg allergener du vil få advarsler om når du scanner produkter.
      </Text>

      <View style={styles.list}>
        {ALLERGY_TYPES.map((allergen) => (
          <View
            key={allergen}
            style={[
              styles.listItem,
              { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }
            ]}
          >
            <View style={styles.listItemContent}>
              <Text style={[styles.listItemText, { color: isDark ? "#fff" : "#000" }]}>
                {getAllergyDisplayName(allergen)}
              </Text>
              <Switch
                value={preferences[allergen]}
                onValueChange={() => toggleAllergy(allergen)}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={preferences[allergen] ? "#f5dd4b" : "#f4f3f4"}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: isDark ? "#888" : "#666" }]}>
          Appen vil sjekke produkter mot Open Food Facts-databasen og ingredienslister for å gi deg advarsler.
        </Text>
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
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  list: {
    gap: 8,
  },
  listItem: {
    borderRadius: 8,
    padding: 16,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

