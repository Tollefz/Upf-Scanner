# What to Test - TestFlight v1

## 🎯 Mål for Testen

Når du tester appen i butikker i Danmark, skal vi lære:

1. **Hvor ofte feiler appen?** (found vs not_found vs network_error vs scan_error)
2. **Hvorfor feiler den?** (tydelige states viser årsaken)
3. **Hvilke produkter mangler?** (via rapporter)

## 📱 Hvordan Teste

### 1. Test i Forskellige Butikker

Test i:
- **Netto**
- **Føtex**
- **Rema 1000**
- Andre butikker du besøger

### 2. Test Forskellige Produkttyper

Scan:
- ✅ **Billige hverdagsvarer** (mælk, brød, pasta)
- ✅ **Egne merkevarer** (butikkens private label)
- ✅ **Importvarer** (produkter fra andre lande)

### 3. Hvad Skal Du Gøre?

#### Når Du Scanner et Produkt:

1. **Se på barcoden der vises:**
   - Appen viser: "Skannet: 5701234567890"
   - **Tjek:** Matcher barcoden på pakken?

2. **Se på resultatet:**
   - **FOUND** ✅ - Produktet blev fundet med data
   - **NOT_FOUND** ❌ - Produktet findes ikke i databasen
   - **NETWORK_ERROR** ⚠️ - Kunne ikke hente data (tjek internetforbindelse)
   - **SCAN_ERROR** ⚠️ - Barcode blev ikke læst stabilt (prøv igen)

3. **Hvis NOT_FOUND:**
   - ✅ Tjek at barcoden på skærmen matcher pakken
   - ✅ Tryk på "Rapportér produkt" knappen
   - ✅ Du behøver ikke skrive noget - bare tryk send

4. **Hvis NETWORK_ERROR:**
   - Tjek din internetforbindelse
   - Prøv igen (tryk "Prøv igen")
   - Hvis det stadig fejler, er det sandsynligvis et netværksproblem

5. **Hvis SCAN_ERROR:**
   - Flyt telefonen tættere på barcoden
   - Sørg for godt lys
   - Hold barcoden i ro
   - Prøv igen

## ⏱️ Test Tid

**Anbefalet:** 30-45 minutter i hver butik

**Hvad at notere mentalt:**
- Finder appen produktet? (found vs not_found)
- Hvis ikke: er det NOT_FOUND eller NETWORK_ERROR?
- Matcher barcoden på skærmen pakken?

**Alt andet samles automatisk via rapporterne!**

## 🚫 Hvad SKAL Du IKKE Gøre?

- ❌ **Ikke bekymre dig om OCR** - Det er ikke aktivt i denne version
- ❌ **Ikke bekymre dig om manuel indtastning** - Det er ikke aktivt i denne version
- ❌ **Ikke bekymre dig om UI-polish** - Vi fokuserer på funktionalitet nu

## ✅ Hvad Vi Lærer fra Din Test

Efter testen kan vi se:

1. **Top 20 mest rapporterede EAN-koder** - Hvilke produkter mangler mest?
2. **State distribution** - Hvor mange ender i found vs not_found vs network_error?
3. **Scan accuracy** - Hvor mange scan_error vs successful scans?

Dette hjælper os med at:
- Prioritere hvilke produkter vi skal tilføje først
- Forbedre scanning-accuracy
- Fikse netværksproblemer

## 📝 Eksempel Test Session

```
Butik: Netto
Tid: 30 minutter

Scan 1: Mælk (Arla) → FOUND ✅
Scan 2: Brød (Netto brand) → NOT_FOUND ❌ → Rapporteret
Scan 3: Pasta (Barilla) → FOUND ✅
Scan 4: Kaffe (Nescafé) → NETWORK_ERROR ⚠️ → Prøvede igen → FOUND ✅
Scan 5: Chips (Tyrkisk import) → NOT_FOUND ❌ → Rapporteret
...
```

## 🎯 Success Kriterier

**Testen er succesfuld hvis:**

- ✅ Du kan scanne produkter og se tydelige resultater
- ✅ Du kan rapportere NOT_FOUND produkter med 1 tryk
- ✅ Du kan se hvilken barcode der blev scannet
- ✅ Du forstår forskellen mellem NOT_FOUND og NETWORK_ERROR

**Du behøver IKKE:**
- ❌ At alle produkter findes (det er netop det vi tester!)
- ❌ At appen er perfekt (vi lærer af fejlene)
- ❌ At skrive lange noter (rapporterne gør det automatisk)

## 💡 Tips

- **Tag din tid** - Du behøver ikke skynde dig
- **Test forskellige produkter** - Jo mere varieret, jo bedre data
- **Tjek barcoden** - Sørg for at den matcher pakken
- **Rapporter NOT_FOUND** - Det er det vigtigste!

Tak for din hjælp! 🙏

