/**
 * Design System Theme
 * 
 * Lys, hyggelig og "matvennlig" design-system
 * - Off-white bakgrunn
 * - Mild grønn primærfarge
 * - Varm gul/oransje sekundærfarge
 * - Myke runde kort
 * - Subtile skygger
 */

import { Platform, TextStyle } from 'react-native';

// Colors
export const Colors = {
  // Background
  background: '#F8FAF9', // Off-white
  
  // Primary colors
  primary: '#4CAF50', // Mild grønn
  primaryDark: '#388E3C',
  primaryLight: '#81C784',
  
  // Secondary colors
  secondary: '#FFB74D', // Varm gul/oransje
  secondaryDark: '#FF8A65',
  secondaryLight: '#FFCC80',
  
  // Text
  textPrimary: '#2E2E2E',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textOnPrimary: '#FFFFFF',
  
  // Card
  cardBackground: '#FFFFFF',
  cardBorder: '#E8EAE9',
  
  // Status colors (varme farger)
  warning: '#FFB74D', // Varm gul
  info: '#64B5F6', // Lys blå (for info, ikke error)
  success: '#4CAF50', // Grønn
  error: '#E57373', // Myk rød (ikke skrikende)
  
  // Divider
  divider: '#E8EAE9',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// Spacing system (8/12/16/24)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Border radius (myke runde kort: 16-20)
export const Radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  round: 9999,
};

// Typography
const baseFontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography: {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  bodyBold: TextStyle;
  caption: TextStyle;
  button: TextStyle;
} = {
  h1: {
    fontFamily: baseFontFamily,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: Colors.textPrimary,
  },
  h2: {
    fontFamily: baseFontFamily,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily: baseFontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.textPrimary,
  },
  title: {
    fontFamily: baseFontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  body: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  bodyBold: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  button: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.textOnPrimary,
  },
};

// Shadows (subtile, ikke harde linjer)
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2, // Android
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8, // Android
  },
};

// Export all
export default {
  Colors,
  Spacing,
  Radius,
  Typography,
  Shadows,
};

