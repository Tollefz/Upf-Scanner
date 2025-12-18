-- SQL Queries for Analyzing Missing Product Reports (DK)
-- For upf-scanner-app backend analysis

-- ============================================
-- 1. TOP MISSING BARCODES (Mest Rapportert)
-- ============================================

-- 1.1 Top barcodes (mest rapportert) - Alle issue types
SELECT
    barcode,
    barcode_type,
    issue_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(*) AS unique_days,
    MIN(created_at) AS first_seen,
    MAX(last_seen_at) AS last_seen,
    MAX(product_name_seen) AS product_name_seen -- Most recent product name if available
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY barcode, barcode_type, issue_type
ORDER BY total_reports DESC
LIMIT 50;

-- 1.2 Kun "NOT_FOUND" (ren dekning) - Viktigst for DB-fiks
SELECT
    barcode,
    barcode_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(*) AS unique_days,
    MIN(created_at) AS first_seen,
    MAX(last_seen_at) AS last_seen,
    MAX(product_name_seen) AS product_name_seen
FROM missing_product_reports
WHERE country = 'DK'
  AND issue_type = 'NOT_FOUND'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY barcode, barcode_type
ORDER BY total_reports DESC
LIMIT 50;

-- 1.3 Fordeling av feiltyper (helse-sjekk)
SELECT
    issue_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(DISTINCT barcode) AS unique_barcodes,
    COUNT(*) AS unique_reports
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY issue_type
ORDER BY total_reports DESC;

-- 1.4 Datakilde-problemer (hvis lookup_source brukes)
SELECT
    lookup_source,
    issue_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(DISTINCT barcode) AS unique_barcodes
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY lookup_source, issue_type
ORDER BY total_reports DESC;

-- ============================================
-- 2. DAGLIG STATISTIKK
-- ============================================

-- 2.1 Rapporter per dag
SELECT
    DATE(created_at) AS report_date,
    issue_type,
    COUNT(*) AS report_count,
    SUM(occurrence_count) AS total_occurrences,
    COUNT(DISTINCT barcode) AS unique_barcodes
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY DATE(created_at), issue_type
ORDER BY report_date DESC, issue_type;

-- ============================================
-- 3. APP VERSION ANALYSIS
-- ============================================

-- 3.1 Rapporter per app version
SELECT
    app_version,
    build_number,
    issue_type,
    SUM(occurrence_count) AS total_reports,
    COUNT(DISTINCT barcode) AS unique_barcodes
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY app_version, build_number, issue_type
ORDER BY total_reports DESC;

-- ============================================
-- 4. DEVICE ANALYSIS
-- ============================================

-- 4.1 Rapporter per device model
SELECT
    device_model,
    os_version,
    issue_type,
    SUM(occurrence_count) AS total_reports
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY device_model, os_version, issue_type
ORDER BY total_reports DESC
LIMIT 20;

-- ============================================
-- 5. NETWORK ERROR ANALYSIS
-- ============================================

-- 5.1 Network errors detaljert
SELECT
    error_code,
    http_status,
    lookup_source,
    SUM(occurrence_count) AS total_reports,
    COUNT(DISTINCT barcode) AS unique_barcodes
FROM missing_product_reports
WHERE country = 'DK'
  AND issue_type = 'LOOKUP_ERROR'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY error_code, http_status, lookup_source
ORDER BY total_reports DESC;

-- ============================================
-- 6. CSV EXPORT QUERY (For /export.csv endpoint)
-- ============================================

-- This query is used by the CSV export endpoint
SELECT
    created_at,
    last_seen_at,
    barcode,
    barcode_type,
    issue_type,
    lookup_source,
    http_status,
    error_code,
    occurrence_count,
    app_version,
    build_number,
    os_version,
    device_model,
    locale,
    product_name_seen,
    country
FROM missing_product_reports
WHERE country = COALESCE(:country, 'DK')
  AND created_at >= :from_date
  AND created_at < :to_date
  AND (:issue_type IS NULL OR issue_type = :issue_type)
ORDER BY created_at DESC
LIMIT COALESCE(:limit, 1000);

-- ============================================
-- 7. QUICK INSIGHTS (For Dashboard)
-- ============================================

-- 7.1 Totalt oversikt
SELECT
    COUNT(*) AS total_reports,
    SUM(occurrence_count) AS total_occurrences,
    COUNT(DISTINCT barcode) AS unique_barcodes,
    COUNT(DISTINCT DATE(created_at)) AS days_with_reports,
    MIN(created_at) AS first_report,
    MAX(last_seen_at) AS last_report
FROM missing_product_reports
WHERE country = 'DK'
  AND created_at >= :from_date
  AND created_at < :to_date;

-- 7.2 Top 20 barcodes (quick view)
SELECT
    barcode,
    barcode_type,
    SUM(occurrence_count) AS total_reports,
    MAX(product_name_seen) AS product_name
FROM missing_product_reports
WHERE country = 'DK'
  AND issue_type = 'NOT_FOUND'
  AND created_at >= :from_date
  AND created_at < :to_date
GROUP BY barcode, barcode_type
ORDER BY total_reports DESC
LIMIT 20;

