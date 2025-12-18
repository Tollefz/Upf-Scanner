/**
 * GTIN Validation Utilities
 * 
 * Støtter EAN-8, UPC-A (12), EAN-13, GTIN-14
 */

export interface GTINValidationResult {
  ok: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Calculates GS1 GTIN checksum using correct GS1 algorithm
 * 
 * GS1 checksum:
 * - Start from right (before check digit)
 * - Multiply by weights: 3, 1, 3, 1, 3, 1... (alternating)
 * - Sum all products
 * - Check digit = (10 - (sum % 10)) % 10
 */
function calculateChecksum(gtin: string): number {
  const digits = gtin.split('').map(Number);
  const body = digits.slice(0, -1); // All digits except the check digit
  const checkDigit = digits[digits.length - 1];
  
  // GS1: sum from right in body, weights 3,1,3,1...
  let sum = 0;
  let weight = 3;
  
  // Iterate from right to left (end of body to start)
  for (let i = body.length - 1; i >= 0; i--) {
    sum += body[i] * weight;
    weight = weight === 3 ? 1 : 3; // Alternate between 3 and 1
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck;
}

/**
 * Validates GTIN/EAN code
 * 
 * Supports:
 * - EAN-8 (8 digits)
 * - UPC-A (12 digits)
 * - EAN-13 (13 digits)
 * - GTIN-14 (14 digits)
 * 
 * @param gtin - GTIN string (can contain spaces/hyphens)
 * @returns Validation result with normalized GTIN if valid
 */
export function validateGTIN(gtin: string): GTINValidationResult {
  // Remove spaces, hyphens, and normalize
  const normalized = gtin.replace(/[\s-]/g, '').trim();
  
  // Check length
  if (normalized.length !== 8 && normalized.length !== 12 && normalized.length !== 13 && normalized.length !== 14) {
    return {
      ok: false,
      error: `Ugyldig GTIN-lengde: ${normalized.length}. Forventet 8, 12, 13 eller 14 siffer.`,
    };
  }
  
  // Check if all digits
  if (!/^\d+$/.test(normalized)) {
    return {
      ok: false,
      error: 'GTIN må kun inneholde siffer',
    };
  }
  
  // Validate checksum using GS1 algorithm
  const checkDigit = parseInt(normalized[normalized.length - 1], 10);
  const calculatedCheck = calculateChecksum(normalized);
  
  if (checkDigit !== calculatedCheck) {
    return {
      ok: false,
      error: `Ugyldig GTIN-checksum (forventet ${calculatedCheck}, fikk ${checkDigit})`,
    };
  }
  
  return {
    ok: true,
    normalized,
  };
}

/**
 * Detects GTIN type from length
 */
export function detectGTINType(gtin: string): 'EAN-8' | 'UPC-A' | 'EAN-13' | 'GTIN-14' | 'UNKNOWN' {
  const normalized = gtin.replace(/[\s-]/g, '');
  
  switch (normalized.length) {
    case 8:
      return 'EAN-8';
    case 12:
      return 'UPC-A';
    case 13:
      return 'EAN-13';
    case 14:
      return 'GTIN-14';
    default:
      return 'UNKNOWN';
  }
}

