-- PostgreSQL Schema for missing_product_reports
-- For upf-scanner-app backend (DK)

CREATE TABLE IF NOT EXISTS missing_product_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    country CHAR(2) NOT NULL DEFAULT 'DK',

    barcode VARCHAR(32) NOT NULL,
    barcode_type VARCHAR(16),

    issue_type VARCHAR(32) NOT NULL CHECK (
        issue_type IN (
            'NOT_FOUND',
            'MISSING_INGREDIENTS',
            'LOOKUP_ERROR',
            'OCR_FAILED'
        )
    ),

    lookup_source VARCHAR(64),
    http_status INTEGER,
    error_code VARCHAR(64),

    product_name_seen TEXT,
    user_note TEXT CHECK (char_length(user_note) <= 500),

    app_version VARCHAR(16) NOT NULL,
    build_number VARCHAR(16) NOT NULL,
    os_version VARCHAR(16) NOT NULL,
    device_model VARCHAR(64) NOT NULL,
    locale VARCHAR(16) DEFAULT 'da-DK',

    occurrence_count INTEGER DEFAULT 1,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    product_photo_url TEXT,
    ingredients_photo_url TEXT,

    dedupe_hash VARCHAR(64) NOT NULL,

    raw_payload JSONB,

    -- Indexes for performance
    CONSTRAINT idx_dedupe_hash UNIQUE (dedupe_hash)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_missing_product_reports_barcode ON missing_product_reports(barcode);
CREATE INDEX IF NOT EXISTS idx_missing_product_reports_issue_type ON missing_product_reports(issue_type);
CREATE INDEX IF NOT EXISTS idx_missing_product_reports_created_at ON missing_product_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missing_product_reports_occurrence_count ON missing_product_reports(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_missing_product_reports_country ON missing_product_reports(country);

-- Function to generate dedupe hash
CREATE OR REPLACE FUNCTION generate_dedupe_hash(
    p_barcode VARCHAR,
    p_issue_type VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    today_date VARCHAR;
BEGIN
    today_date := to_char(CURRENT_DATE, 'YYYY-MM-DD');
    RETURN encode(digest(p_barcode || ':' || p_issue_type || ':' || today_date, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to upsert report (handle dedupe)
CREATE OR REPLACE FUNCTION upsert_missing_product_report(
    p_country CHAR(2),
    p_barcode VARCHAR(32),
    p_barcode_type VARCHAR(16),
    p_issue_type VARCHAR(32),
    p_lookup_source VARCHAR(64),
    p_http_status INTEGER,
    p_error_code VARCHAR(64),
    p_product_name_seen TEXT,
    p_user_note TEXT,
    p_app_version VARCHAR(16),
    p_build_number VARCHAR(16),
    p_os_version VARCHAR(16),
    p_device_model VARCHAR(64),
    p_locale VARCHAR(16),
    p_product_photo_url TEXT,
    p_ingredients_photo_url TEXT,
    p_raw_payload JSONB
) RETURNS UUID AS $$
DECLARE
    v_dedupe_hash VARCHAR(64);
    v_report_id UUID;
BEGIN
    -- Generate dedupe hash
    v_dedupe_hash := generate_dedupe_hash(p_barcode, p_issue_type);

    -- Try to find existing report
    SELECT id INTO v_report_id
    FROM missing_product_reports
    WHERE dedupe_hash = v_dedupe_hash;

    IF v_report_id IS NOT NULL THEN
        -- Update existing report
        UPDATE missing_product_reports
        SET
            occurrence_count = occurrence_count + 1,
            last_seen_at = now(),
            -- Update fields if provided
            product_name_seen = COALESCE(p_product_name_seen, product_name_seen),
            user_note = COALESCE(p_user_note, user_note),
            product_photo_url = COALESCE(p_product_photo_url, product_photo_url),
            ingredients_photo_url = COALESCE(p_ingredients_photo_url, ingredients_photo_url),
            raw_payload = COALESCE(p_raw_payload, raw_payload)
        WHERE id = v_report_id;

        RETURN v_report_id;
    ELSE
        -- Insert new report
        INSERT INTO missing_product_reports (
            country, barcode, barcode_type, issue_type,
            lookup_source, http_status, error_code,
            product_name_seen, user_note,
            app_version, build_number, os_version, device_model, locale,
            product_photo_url, ingredients_photo_url,
            dedupe_hash, raw_payload
        ) VALUES (
            p_country, p_barcode, p_barcode_type, p_issue_type,
            p_lookup_source, p_http_status, p_error_code,
            p_product_name_seen, p_user_note,
            p_app_version, p_build_number, p_os_version, p_device_model, p_locale,
            p_product_photo_url, p_ingredients_photo_url,
            v_dedupe_hash, p_raw_payload
        ) RETURNING id INTO v_report_id;

        RETURN v_report_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View for top reported barcodes
CREATE OR REPLACE VIEW top_missing_products AS
SELECT
    barcode,
    barcode_type,
    issue_type,
    product_name_seen,
    occurrence_count,
    last_seen_at,
    created_at,
    country
FROM missing_product_reports
ORDER BY occurrence_count DESC, last_seen_at DESC;

-- View for daily statistics
CREATE OR REPLACE VIEW daily_report_stats AS
SELECT
    DATE(created_at) as report_date,
    country,
    issue_type,
    COUNT(*) as total_reports,
    COUNT(DISTINCT barcode) as unique_barcodes,
    SUM(occurrence_count) as total_occurrences
FROM missing_product_reports
GROUP BY DATE(created_at), country, issue_type
ORDER BY report_date DESC, country, issue_type;

