# State Machine Dokumentation - upf-scanner-app

## Oversigt

Dette dokument beskriver den komplette state machine implementeret i React Native/TypeScript for upf-scanner-app.

## State Definition

```typescript
type ScanState = 
  | { type: 'idle' }
  | { type: 'scanning'; detectedBarcodes: string[] }
  | { type: 'scan_error'; message: string; suggestions: string[] }
  | { type: 'loading'; barcode: string; barcodeType?: string }
  | { type: 'found'; barcode: string; barcodeType?: string; product: OffProduct; ingredientsText: string; dataSource: 'openfoodfacts' | 'ocr' | 'manual' }
  | { type: 'not_found'; barcode: string; barcodeType?: string }
  | { type: 'missing_data'; barcode: string; barcodeType?: string; product: OffProduct }
  | { type: 'network_error'; barcode: string; barcodeType?: string; message: string; retryable: boolean };
```

## State Transitions

### Flow Diagram

```
idle
  ↓ (barcode detected)
scanning (multi-frame validation)
  ↓ (validation success)
loading (lookup in progress)
  ↓
found | not_found | missing_data | network_error | scan_error
```

### Transition Rules

1. **idle → scanning**
   - Trigger: First barcode detected
   - Action: Start multi-frame validation timer

2. **scanning → loading**
   - Trigger: Same barcode detected ≥3 times within 1.5s, ≥60% of reads
   - Action: Reset aggregator, start product lookup

3. **scanning → scan_error**
   - Trigger: Multiple different barcodes detected, no clear winner
   - Action: Show error with suggestions

4. **loading → found**
   - Condition: Product found with ingredients (length ≥15)
   - Action: Display product info, calculate UPF score

5. **loading → not_found**
   - Condition: HTTP 404 OR `status: 0` from API
   - Action: Show "Produktet blev ikke fundet", enable reporting

6. **loading → missing_data**
   - Condition: Product found BUT ingredients missing/incomplete
   - Action: Show "Mangler oplysninger", enable OCR/reporting

7. **loading → network_error**
   - Condition: Timeout, 5xx, offline, DNS failure
   - Action: Show "Kunne ikke hente data", enable retry

8. **Any state → idle**
   - Trigger: User clicks "Scan igen"
   - Action: Reset all state, clear aggregator

## Multi-frame Barcode Validation

### Implementation

```typescript
class BarcodeAggregator {
  private reads: Map<string, number> = new Map();
  private readonly threshold = 3;
  private readonly minPercentage = 60;

  add(read: string): { valid: boolean; barcode?: string } {
    const normalized = read.trim();
    const count = (this.reads.get(normalized) || 0) + 1;
    this.reads.set(normalized, count);

    // Calculate totals
    let totalReads = 0;
    let maxCount = 0;
    let mostFrequent = '';

    this.reads.forEach((c, barcode) => {
      totalReads += c;
      if (c > maxCount) {
        maxCount = c;
        mostFrequent = barcode;
      }
    });

    const percentage = (maxCount / totalReads) * 100;

    if (maxCount >= this.threshold && percentage >= this.minPercentage) {
      return { valid: true, barcode: mostFrequent };
    }

    return { valid: false };
  }

  reset(): void {
    this.reads.clear();
  }
}
```

### Validation Rules

- **Collection window**: 1.5 seconds
- **Minimum reads**: 3 of same barcode
- **Dominance**: Most frequent must be ≥60% of total reads
- **Failure**: If multiple different barcodes → `scan_error`

## Error Handling - Critical Distinctions

### ❌ WRONG (Don't Do This)

```typescript
// DON'T: Treat 404 as network error
if (response.status === 404) {
  state = networkError; // ❌ WRONG
}

// DON'T: Treat timeout as not found
if (error.type === 'timeout') {
  state = notFound; // ❌ WRONG
}
```

### ✅ CORRECT (Do This)

```typescript
// ✅ CORRECT: 404 = not found
if (response.status === 404 || response.status === 0) {
  state = { type: 'not_found', barcode };
}

// ✅ CORRECT: Timeout = network error
if (error.type === 'timeout' || error.type === 'network_error') {
  state = { type: 'network_error', barcode, message, retryable: true };
}
```

## UI Rendering per State

### idle
- Show camera view
- No overlay

### scanning
- Show camera view
- Overlay: "Læser stregkode..." + detected barcode

### loading
- Hide camera
- Show: "Skannet: {barcode}" + "Søger efter produkt…"
- Show spinner

### found
- Hide camera
- Show product info
- Show UPF score
- Show allergens
- Show ingredients

### not_found
- Hide camera
- Title: "Produktet blev ikke fundet"
- Show: "Skannet: {barcode} ({type})"
- Button: "Rapportér produkt"
- Button: "Scan igen"

### missing_data
- Hide camera
- Title: "Mangler oplysninger"
- Show product name (if available)
- Show: "Skannet: {barcode} ({type})"
- Button: "Rapportér manglende info"
- Button: "Scan igen"

### network_error
- Hide camera
- Title: "Kunne ikke hente data"
- Show: "Skannet: {barcode} ({type})"
- Button: "Prøv igen" (if retryable)
- Button: "Rapportér problem"
- Button: "Scan igen"

### scan_error
- Hide camera
- Title: "Stregkoden blev ikke læst stabilt"
- Suggestions:
  - "Flyt tættere på"
  - "Bedre lys"
  - "Hold stregkoden i ro"
- Button: "Prøv igen"

## State Machine Pseudocode (Swift-style)

```swift
enum ScanResultState {
    case idle
    case scanning([String])
    case loading(barcode: String, type: String?)
    case found(Product)
    case notFound(barcode: String, type: String?)
    case missingData(Product)
    case networkError(barcode: String, message: String, retryable: Bool)
    case scanError(reason: String, suggestions: [String])
}

class BarcodeAggregator {
    private var reads: [String: Int] = [:]
    private let threshold = 3
    private let minPercentage = 60.0

    func add(read: String) -> (valid: Bool, barcode: String?) {
        reads[read, default: 0] += 1
        
        let totalReads = reads.values.reduce(0, +)
        let maxCount = reads.values.max() ?? 0
        let mostFrequent = reads.max(by: { $0.value < $1.value })?.key ?? ""
        
        let percentage = Double(maxCount) / Double(totalReads) * 100.0
        
        if maxCount >= threshold && percentage >= minPercentage {
            return (true, mostFrequent)
        }
        
        return (false, nil)
    }
    
    func reset() {
        reads.removeAll()
    }
}

func onBarcodeDetected(_ code: String) {
    guard state == .scanning || state == .idle else { return }
    
    if state == .idle {
        state = .scanning([code])
    }
    
    if let result = aggregator.add(read: code), result.valid, let barcode = result.barcode {
        aggregator.reset()
        let barcodeType = detectBarcodeType(barcode)
        state = .loading(barcode: barcode, type: barcodeType)
        lookup(barcode: barcode, type: barcodeType)
    }
}

func lookup(barcode: String, type: String?) async {
    do {
        let response = try await productService.fetch(barcode)
        
        if response.status == 0 || response.product == nil {
            state = .notFound(barcode: barcode, type: type)
        } else if response.product.ingredients.isEmpty || response.product.ingredients.count < 15 {
            state = .missingData(response.product)
        } else {
            state = .found(response.product)
        }
        
    } catch NetworkError.offline,
            NetworkError.timeout,
            NetworkError.server {
        state = .networkError(
            barcode: barcode,
            message: error.localizedDescription,
            retryable: true
        )
    } catch {
        state = .scanError(
            reason: error.localizedDescription,
            suggestions: ["Prøv igen", "Tjek internetforbindelse"]
        )
    }
}
```

## Testing Checklist

- [ ] Scan stable barcode → Should go to `found` or `not_found`
- [ ] Scan unstable barcode → Should show `scan_error`
- [ ] Test offline → Should show `network_error`, NOT `not_found`
- [ ] Test 404 → Should show `not_found`, NOT `network_error`
- [ ] Test timeout → Should show `network_error`, NOT `not_found`
- [ ] Test missing ingredients → Should show `missing_data`
- [ ] Verify barcode always shown before lookup
- [ ] Verify barcode type detected and shown
- [ ] Test retry from `network_error` → Should retry lookup
- [ ] Test "Scan igen" → Should reset to `idle`

## Performance Considerations

- Multi-frame validation window: 1.5 seconds (adjustable)
- Minimum reads threshold: 3 (adjustable)
- Dominance percentage: 60% (adjustable)
- Cache duration: 5 minutes (for successful lookups)

## Future Enhancements

1. **Adaptive thresholds**: Adjust based on device/camera quality
2. **Haptic feedback**: Vibrate when barcode is "locked"
3. **Sound feedback**: Optional beep on successful scan
4. **Visual feedback**: Green border when barcode is stable
5. **Scan history**: Remember last N scanned barcodes for quick retry

