# Hook Order Fix - Index Screen

## Problem Fixed

**Error:** "Rendered more hooks than during the previous render"

**Root Cause:** Hooks were declared AFTER early returns (lines 977-988), causing hook order to change when permission state changed.

## Solution Applied

### 1. Moved All Hooks Before Early Returns

**Before:**
```typescript
export default function Index() {
  // ... hooks ...
  
  if (!permission) return <Text>...</Text>;  // ❌ Early return
  
  if (!permission.granted) {
    return <View>...</View>;  // ❌ Early return
  }
  
  // ❌ Hooks declared AFTER early returns
  const handleOcrScan = useCallback(...);
  const handleManualEntrySubmit = useCallback(...);
  const handleReportProduct = useCallback(...);
}
```

**After:**
```typescript
// IMPORTANT: Do not add hooks conditionally. Keep hook order stable.
export default function Index() {
  // ✅ ALL hooks declared first
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  // ... all useState hooks ...
  // ... all useCallback hooks ...
  // ... all useMemo hooks ...
  // ... all useEffect hooks ...
  // ... all useFocusEffect hooks ...
  
  // ✅ Early returns AFTER all hooks
  if (!permission) return <Text>...</Text>;
  if (!permission.granted) {
    return <View>...</View>;
  }
  
  // ✅ Main render
  return <View>...</View>;
}
```

### 2. Hook Order (Stable)

All hooks are now declared in this stable order:

1. **Router hooks:**
   - `useLocalSearchParams()`
   - `useCameraPermissions()`

2. **State hooks:**
   - All `useState()` declarations (in order)

3. **Custom hooks:**
   - `useColorScheme()`

4. **Computed values:**
   - Derived values (barcode, loading) - not hooks, but computed

5. **useCallback hooks:**
   - `detectBarcodeType`
   - `handleBarcodeScan`
   - `validateBarcode`
   - `handleBarcodeDetected`
   - `handleRetry`
   - `handleOcrScan`
   - `handleManualEntrySubmit`
   - `requestImagePickerPermission`
   - `showToastMessage`
   - `handleReportProduct`

6. **useEffect hooks:**
   - Barcode from params effect
   - Cleanup timer effect
   - Favorite status effect
   - Save to history effect

7. **useMemo hooks:**
   - `finalIngredientsText`
   - `off`
   - `upf`
   - `allergyResult`
   - `allergenDetection`

8. **useFocusEffect:**
   - Load allergy preferences

9. **Early returns:**
   - Permission checks

10. **Main render:**
    - JSX with conditional rendering based on state

## Rules Enforced

✅ **All hooks are unconditional** - No hooks inside if statements
✅ **All hooks are at top level** - No hooks inside nested functions
✅ **All hooks before early returns** - Early returns come after all hooks
✅ **Stable hook order** - Same hooks called in same order every render

## Testing

After this fix:
- ✅ No "Rendered more hooks" error
- ✅ Hook order is stable across renders
- ✅ All functionality preserved
- ✅ No behavior regressions

## Prevention

Added comment at top of component:
```typescript
// IMPORTANT: Do not add hooks conditionally. Keep hook order stable.
// All hooks must be declared at the top level before any early returns.
```

This prevents future developers from accidentally breaking hook order.

## Files Changed

- `app/(tabs)/index.tsx` - Moved all hooks before early returns

---

**Status:** ✅ Fixed - Hook order is now stable

