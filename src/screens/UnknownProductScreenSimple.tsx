/**
 * Unknown Product Screen - Enkel versjon
 * 
 * Lav friksjon UX: Ett trykk for å rapportere produktet
 * - Ingen tekstinput
 * - Ingen valg
 * - Tydelig beskjed
 * - Hyggelig bekreftelse
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { reportProduct } from '../utils/reportProduct';
import { Colors, Radius, Spacing, Typography } from '../theme';
import { ScreenContainer, Card, PrimaryButton, SecondaryButton, Banner } from '../components';

type ScreenState = 'default' | 'loading' | 'success' | 'error';

export function UnknownProductScreenSimple() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gtin: string }>();
  const gtin = params.gtin || '';

  const [state, setState] = useState<ScreenState>('default');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Automatisk navigering etter suksess
  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(() => {
        router.back();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  const handleReport = async () => {
    if (!gtin || state === 'loading') {
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const result = await reportProduct(gtin);

      if (result.success) {
        setState('success');
      } else {
        setState('error');
        setErrorMessage(result.message || 'Kunne ikke sende rapport. Prøv igjen.');
      }
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || 'Noe gikk galt. Prøv igjen senere.');
    }
  };

  const handleSkip = () => {
    router.back();
  };

  // Success state - vis takk-melding
  if (state === 'success') {
    return (
      <ScreenContainer style={styles.successContainer} padding="none">
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>❤️</Text>
          <Text style={styles.successTitle}>Takk for rapporten!</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Default/loading/error state
  return (
    <ScreenContainer padding="lg">
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔍</Text>
          <Text style={styles.title}>Fant ikke produktet</Text>
          <Text style={styles.subtitle}>
            Vi fant ikke dette produktet i databasen.
          </Text>
        </View>

        {/* GTIN Display */}
        <Card padding="md" style={styles.gtinCard}>
          <Text style={styles.gtinLabel}>Strekkode</Text>
          <Text style={styles.gtinValue}>{gtin}</Text>
        </Card>

        {/* Error Message */}
        {state === 'error' && errorMessage && (
          <Banner
            message={errorMessage}
            type="error"
            icon="⚠️"
          />
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Primary Action: Rapporter */}
          <PrimaryButton
            title={state === 'loading' ? 'Sender...' : 'Rapporter produkt'}
            onPress={handleReport}
            loading={state === 'loading'}
            disabled={state === 'loading'}
            size="large"
          />

          {/* Secondary Action: Hopp over */}
          <SecondaryButton
            title="Hopp over"
            onPress={handleSkip}
            disabled={state === 'loading'}
            size="large"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingTop: Spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.subtitle,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  gtinCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gtinLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  gtinValue: {
    ...Typography.body,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    fontSize: 18,
  },
  actions: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h1,
    color: Colors.primary,
    textAlign: 'center',
  },
});

