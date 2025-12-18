/**
 * ReportProductButton - Enkel knapp for å rapportere produkter
 * 
 * Bruk denne komponenten for å la brukere rapportere produkter som mangler i databasen.
 * 
 * @example
 * <ReportProductButton 
 *   gtin="3017620422003" 
 *   comment="Dette produktet mangler i databasen"
 *   onSuccess={() => console.log('Rapport sendt!')}
 * />
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { reportProduct } from '../utils/reportProduct';

export interface ReportProductButtonProps {
  /** Produktkode (GTIN/EAN) som skal rapporteres */
  gtin: string;
  
  /** Valgfritt kommentar/grunn for rapport */
  comment?: string;
  
  /** Callback når rapport er sendt (suksess) */
  onSuccess?: () => void;
  
  /** Callback når rapport feiler */
  onError?: (error: string) => void;
  
  /** Tilpasset tekst på knappen */
  buttonText?: string;
  
  /** Om knappen skal være disabled */
  disabled?: boolean;
}

/**
 * Knapp for å rapportere et produkt
 */
export function ReportProductButton({
  gtin,
  comment,
  onSuccess,
  onError,
  buttonText = 'Rapporter produkt',
  disabled = false,
}: ReportProductButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleReport = async () => {
    if (!gtin || disabled || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await reportProduct(gtin, comment);

      if (result.success) {
        // Vis suksessmelding
        Alert.alert('Takk! 🙏', 'Takk for rapporten 🙏', [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
            },
          },
        ]);
      } else {
        // Vis feilmelding
        Alert.alert('Kunne ikke sende rapport', result.message, [
          {
            text: 'OK',
            onPress: () => {
              onError?.(result.message);
            },
          },
        ]);
      }
    } catch (error: any) {
      // Uventet feil
      const errorMessage = error.message || 'Noe gikk galt. Prøv igjen senere.';
      Alert.alert('Feil', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || isLoading) && styles.buttonDisabled]}
      onPress={handleReport}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.buttonText}>Sender...</Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>{buttonText}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

