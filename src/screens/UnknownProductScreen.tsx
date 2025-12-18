/**
 * Unknown Product Screen
 * 
 * Håndterer "produkt ikke funnet"-tilstand på en hyggelig og nyttig måte.
 * Lar brukeren ta bilde, skrive navn manuelt, eller hoppe over.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { submitReport } from '../utils/unknownReportSender';
import { Colors, Radius, Spacing, Typography, Shadows } from '../theme';

export function UnknownProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gtin: string; ocrText?: string }>();
  const gtin = params.gtin || '';
  const ocrText = params.ocrText;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [note, setNote] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('Takk for rapporten!');

  /**
   * Be om tillatelse og ta bilde
   */
  const handleTakePhoto = async () => {
    try {
      // Be om tillatelse
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Kameratillatelse nødvendig',
          'Vi trenger tilgang til kameraet for å ta et bilde av produktet.'
        );
        return;
      }

      // Ta bilde
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Kvadratisk
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Kunne ikke ta bilde', 'Det oppstod en feil ved åpning av kamera.');
    }
  };

  /**
   * Lagre og rapporter ukjent produkt
   */
  const handleSave = async () => {
    if (!gtin) {
      Alert.alert('Mangler GTIN', 'Kunne ikke rapportere uten GTIN.');
      return;
    }

    setIsSaving(true);

    try {
      const report = {
        gtin,
        createdAt: new Date().toISOString(),
        photoUri: photoUri || undefined,
        manualName: manualName.trim() || undefined,
        note: note.trim() || undefined,
        ocrText: ocrText || undefined,
      };

      const result = await submitReport(report);

      if (result.success) {
        setThankYouMessage(result.message);
        setShowThankYou(true);

        // Naviger tilbake etter kort delay
        setTimeout(() => {
          router.back();
        }, result.offline ? 2500 : 1500);
      } else {
        // Partial success - report saved but not sent
        setThankYouMessage(result.message);
        setShowThankYou(true);
        setTimeout(() => {
          router.back();
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Kunne ikke rapportere', error.message || 'Det oppstod en feil. Prøv igjen.');
      setIsSaving(false);
    }
  };

  /**
   * Hopp over (naviger uten å lagre)
   */
  const handleSkip = () => {
    router.back();
  };

  /**
   * Fjern bilde
   */
  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  // Vis "Takk!" melding
  if (showThankYou) {
    return (
      <View style={styles.thankYouContainer}>
        <Text style={styles.thankYouIcon}>✅</Text>
        <Text style={styles.thankYouText}>Takk!</Text>
        <Text style={styles.thankYouSubtext}>{thankYouMessage}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔍</Text>
          <Text style={styles.title}>Fant ikke produktet</Text>
          <Text style={styles.subtitle}>
            Hjelp oss å legge det til – tar under 10 sek
          </Text>
        </View>

        {/* GTIN Display */}
        <View style={styles.gtinContainer}>
          <Text style={styles.gtinLabel}>Strekkode</Text>
          <Text style={styles.gtinValue}>{gtin}</Text>
        </View>

        {/* Photo Section */}
        <View style={styles.photoSection}>
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={handleRemovePhoto}
                activeOpacity={0.8}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>
                Ingen bilde valgt
              </Text>
            </View>
          )}

          {/* Photo Buttons */}
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.photoButtonText}>📷 Ta bilde av produktets front</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Input Section (Toggle) */}
        {showManualInput ? (
          <View style={styles.manualInputSection}>
            <Text style={styles.manualInputLabel}>
              Produktnavn (valgfritt)
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="F.eks. Nutella 400g"
              value={manualName}
              onChangeText={setManualName}
              maxLength={100}
              autoCapitalize="words"
              returnKeyType="done"
            />
            
            <Text style={styles.manualInputLabel}>
              Notat (valgfritt)
            </Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              placeholder="Eventuelle ekstra detaljer..."
              value={note}
              onChangeText={setNote}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.showManualInputButton}
            onPress={() => setShowManualInput(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.showManualInputText}>
              ✏️ Skriv navn manuelt
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonTextPrimary}>
                {photoUri || manualName || note ? 'Rapporter' : 'Hopp over'}
              </Text>
            )}
          </TouchableOpacity>

          {(photoUri || manualName) && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleSkip}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonTextSecondary}>Hopp over</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
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
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  gtinContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
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
  },
  photoSection: {
    marginBottom: Spacing.lg,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBackground,
    ...Shadows.card,
  },
  removePhotoButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  photoPlaceholderIcon: {
    fontSize: 48,
    opacity: 0.3,
    marginBottom: Spacing.sm,
  },
  photoPlaceholderText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  photoButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    ...Shadows.button,
  },
  photoButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manualInputSection: {
    marginBottom: Spacing.lg,
  },
  manualInputLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    color: Colors.textPrimary,
  },
  textInput: {
    ...Typography.body,
    backgroundColor: Colors.cardBackground,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.card,
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  showManualInputButton: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  showManualInputText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    ...Shadows.button,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  buttonTextPrimary: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  thankYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  thankYouIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  thankYouText: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
    color: Colors.primary,
  },
  thankYouSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
