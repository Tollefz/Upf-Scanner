/**
 * Komplett eksempel: Bruk av ReportProductButton
 * 
 * Dette er et fullstendig eksempel på hvordan du kan bruke
 * ReportProductButton komponenten i din app.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReportProductButton } from '../src/components/ReportProductButton';

/**
 * Eksempel 1: Enkel bruk
 */
export function SimpleExample() {
  const gtin = '3017620422003'; // Eksempel GTIN

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rapporter manglende produkt</Text>
      <ReportProductButton 
        gtin={gtin}
        comment="Dette produktet mangler i databasen"
      />
    </View>
  );
}

/**
 * Eksempel 2: Med callbacks
 */
export function WithCallbacksExample() {
  const gtin = '3017620422003';

  const handleSuccess = () => {
    console.log('Rapport sendt!');
    // Naviger tilbake, oppdater UI, etc.
  };

  const handleError = (error: string) => {
    console.error('Feil ved sending:', error);
    // Vis feilmelding, logg feil, etc.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Produkt ikke funnet?</Text>
      <ReportProductButton 
        gtin={gtin}
        comment="Hjelp oss ved å rapportere dette produktet"
        buttonText="Rapporter produkt"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </View>
  );
}

/**
 * Eksempel 3: Med tilpasset tekst
 */
export function CustomTextExample() {
  const gtin = '3017620422003';

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Fant du ikke produktet? Hjelp oss ved å rapportere det.
      </Text>
      <ReportProductButton 
        gtin={gtin}
        buttonText="Meld fra om manglende produkt"
        comment="Automatisk rapport for manglende produkt"
      />
    </View>
  );
}

/**
 * Eksempel 4: Direkte bruk av reportProduct funksjon
 */
import { useState } from 'react';
import { Button, ActivityIndicator, Alert } from 'react-native';
import { reportProduct } from '../src/utils/reportProduct';

export function DirectFunctionExample() {
  const [loading, setLoading] = useState(false);
  const gtin = '3017620422003';
  const comment = 'Dette produktet mangler i databasen';

  const handleReport = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const result = await reportProduct(gtin, comment);

      if (result.success) {
        Alert.alert('Takk! 🙏', 'Takk for rapporten 🙏');
        console.log('Report ID:', result.reportId);
      } else {
        Alert.alert('Kunne ikke sende rapport', result.message);
      }
    } catch (error: any) {
      Alert.alert('Feil', error.message || 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button 
          title="Rapporter produkt"
          onPress={handleReport}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
});

