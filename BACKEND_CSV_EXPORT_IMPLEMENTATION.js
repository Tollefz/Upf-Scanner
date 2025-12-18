// CSV Export Endpoint Implementation (Node.js/Express)
// For upf-scanner-app backend

const express = require('express');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const app = express();
const pool = new Pool({
  // Your PostgreSQL connection config
  // host: process.env.DB_HOST,
  // port: process.env.DB_PORT,
  // database: process.env.DB_NAME,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
});

// Admin token (should be in environment variable)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Rate limiting
const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Rate limit exceeded. Please try again later.'
  }
});

/**
 * Convert row to CSV line
 */
function rowToCSV(row, columns) {
  return columns.map(col => {
    let value = row[col];
    
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }
    
    // Convert to string
    value = String(value);
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      value = value.replace(/"/g, '""'); // Escape quotes
      value = `"${value}"`; // Wrap in quotes
    }
    
    return value;
  }).join(',');
}

/**
 * CSV Export Endpoint
 */
app.get('/v1/reports/missing-product/export.csv', exportLimiter, async (req, res) => {
  try {
    // Check authentication (simple admin token)
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== ADMIN_TOKEN) {
      return res.status(401).json({
        error: 'Unauthorized. Valid X-Admin-Token header required.'
      });
    }

    // Parse query parameters
    const fromDate = req.query.from;
    const toDate = req.query.to;
    const country = req.query.country || 'DK';
    const issueType = req.query.issue_type || null;
    const limit = parseInt(req.query.limit) || 1000;

    // Validate required parameters
    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: 'Missing required parameters: from and to (ISO date format: YYYY-MM-DD)'
      });
    }

    // Validate date format (basic check)
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    
    if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO format: YYYY-MM-DD'
      });
    }

    if (fromDateObj >= toDateObj) {
      return res.status(400).json({
        error: 'from date must be before to date'
      });
    }

    // Validate limit
    if (limit > 10000) {
      return res.status(400).json({
        error: 'limit cannot exceed 10000'
      });
    }

    // CSV columns (fixed order)
    const columns = [
      'created_at',
      'last_seen_at',
      'barcode',
      'barcode_type',
      'issue_type',
      'lookup_source',
      'http_status',
      'error_code',
      'occurrence_count',
      'app_version',
      'build_number',
      'os_version',
      'device_model',
      'locale',
      'product_name_seen',
      'country'
    ];

    // Build SQL query
    const query = `
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
      WHERE country = $1
        AND created_at >= $2
        AND created_at < $3
        AND ($4::text IS NULL OR issue_type = $4)
      ORDER BY created_at DESC
      LIMIT $5
    `;

    // Execute query
    const result = await pool.query(query, [
      country,
      fromDate,
      toDate,
      issueType,
      limit
    ]);

    // Generate CSV
    const csvLines = [];
    
    // Header row
    csvLines.push(columns.join(','));

    // Data rows
    result.rows.forEach(row => {
      csvLines.push(rowToCSV(row, columns));
    });

    const csvContent = csvLines.join('\n');

    // Generate filename
    const filename = `missing_products_${country}_${fromDate}_${toDate}.csv`;

    // Set response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    // Send CSV
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * JSON Export Endpoint (Alternative - for programmatic access)
 */
app.get('/v1/reports/missing-product/export.json', exportLimiter, async (req, res) => {
  try {
    // Same authentication and validation as CSV endpoint
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== ADMIN_TOKEN) {
      return res.status(401).json({
        error: 'Unauthorized. Valid X-Admin-Token header required.'
      });
    }

    const fromDate = req.query.from;
    const toDate = req.query.to;
    const country = req.query.country || 'DK';
    const issueType = req.query.issue_type || null;
    const limit = parseInt(req.query.limit) || 1000;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: 'Missing required parameters: from and to'
      });
    }

    const query = `
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
      WHERE country = $1
        AND created_at >= $2
        AND created_at < $3
        AND ($4::text IS NULL OR issue_type = $4)
      ORDER BY created_at DESC
      LIMIT $5
    `;

    const result = await pool.query(query, [
      country,
      fromDate,
      toDate,
      issueType,
      limit
    ]);

    res.json({
      count: result.rows.length,
      from: fromDate,
      to: toDate,
      country,
      issue_type: issueType,
      data: result.rows
    });

  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Top Missing Barcodes Endpoint (Quick Analysis)
 */
app.get('/v1/reports/missing-product/top', exportLimiter, async (req, res) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== ADMIN_TOKEN) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    const fromDate = req.query.from || '2025-01-01';
    const toDate = req.query.to || new Date().toISOString().split('T')[0];
    const country = req.query.country || 'DK';
    const issueType = req.query.issue_type || 'NOT_FOUND';
    const limit = parseInt(req.query.limit) || 50;

    const query = `
      SELECT
        barcode,
        barcode_type,
        SUM(occurrence_count) AS total_reports,
        COUNT(*) AS unique_days,
        MIN(created_at) AS first_seen,
        MAX(last_seen_at) AS last_seen,
        MAX(product_name_seen) AS product_name_seen
      FROM missing_product_reports
      WHERE country = $1
        AND issue_type = $2
        AND created_at >= $3
        AND created_at < $4
      GROUP BY barcode, barcode_type
      ORDER BY total_reports DESC
      LIMIT $5
    `;

    const result = await pool.query(query, [
      country,
      issueType,
      fromDate,
      toDate,
      limit
    ]);

    res.json({
      country,
      issue_type: issueType,
      from: fromDate,
      to: toDate,
      count: result.rows.length,
      top_barcodes: result.rows
    });

  } catch (error) {
    console.error('Error getting top barcodes:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Statistics Endpoint (Health Check)
 */
app.get('/v1/reports/missing-product/stats', exportLimiter, async (req, res) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== ADMIN_TOKEN) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    const fromDate = req.query.from || '2025-01-01';
    const toDate = req.query.to || new Date().toISOString().split('T')[0];
    const country = req.query.country || 'DK';

    // Overall stats
    const overallQuery = `
      SELECT
        COUNT(*) AS total_reports,
        SUM(occurrence_count) AS total_occurrences,
        COUNT(DISTINCT barcode) AS unique_barcodes,
        COUNT(DISTINCT DATE(created_at)) AS days_with_reports
      FROM missing_product_reports
      WHERE country = $1
        AND created_at >= $2
        AND created_at < $3
    `;

    // Issue type distribution
    const distributionQuery = `
      SELECT
        issue_type,
        SUM(occurrence_count) AS total_reports,
        COUNT(DISTINCT barcode) AS unique_barcodes
      FROM missing_product_reports
      WHERE country = $1
        AND created_at >= $2
        AND created_at < $3
      GROUP BY issue_type
      ORDER BY total_reports DESC
    `;

    const [overallResult, distributionResult] = await Promise.all([
      pool.query(overallQuery, [country, fromDate, toDate]),
      pool.query(distributionQuery, [country, fromDate, toDate])
    ]);

    res.json({
      country,
      from: fromDate,
      to: toDate,
      overall: overallResult.rows[0],
      by_issue_type: distributionResult.rows
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CSV Export: GET /v1/reports/missing-product/export.csv`);
  console.log(`JSON Export: GET /v1/reports/missing-product/export.json`);
  console.log(`Top Barcodes: GET /v1/reports/missing-product/top`);
  console.log(`Statistics: GET /v1/reports/missing-product/stats`);
});

module.exports = app;

