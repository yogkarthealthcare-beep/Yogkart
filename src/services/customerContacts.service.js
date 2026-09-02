const xlsx = require('xlsx');
const { query, getClient } = require('../config/database');

const CUSTOMER_CONTACTS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS customer_contacts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    source_table TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_email ON customer_contacts (email);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_contact ON customer_contacts (contact);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_country ON customer_contacts (country);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_created_at ON customer_contacts (created_at DESC);
`;

/**
 * Ensures table and indexes exist in PostgreSQL
 */
const ensureCustomerContactsSchema = async () => {
  try {
    await query(CUSTOMER_CONTACTS_SCHEMA_SQL);
    console.log('✅ Customer contacts schema verified/created');
  } catch (err) {
    console.error('❌ Error ensuring customer_contacts schema:', err.message);
  }
};

/**
 * Normalizes an object key to standard database column name
 */
const normalizeHeader = (rawHeader) => {
  if (!rawHeader) return '';
  const clean = String(rawHeader).toLowerCase().replace(/[^a-z0-9]/g, '');

  if (['name', 'fullname', 'customername', 'clientname', 'contactperson', 'username', 'naam', 'firstnamelastname'].includes(clean)) {
    return 'name';
  }
  if (['email', 'emailaddress', 'emailid', 'mail', 'email1', 'contactemail'].includes(clean)) {
    return 'email';
  }
  if (['contact', 'phone', 'phonenumber', 'mobile', 'mobilenumber', 'mobileno', 'contactno', 'telephone', 'cell', 'cellphone', 'whatsapp', 'phone1', 'mobile1'].includes(clean)) {
    return 'contact';
  }
  if (['address', 'fulladdress', 'streetaddress', 'location', 'city', 'deliveryaddress', 'residentialaddress', 'addressline'].includes(clean)) {
    return 'address';
  }
  if (['country', 'nation', 'countryname', 'nationality', 'desh'].includes(clean)) {
    return 'country';
  }
  if (['sourcetable', 'source', 'batch', 'datasource', 'tag', 'campaign'].includes(clean)) {
    return 'source_table';
  }

  return clean;
};

/**
 * Cleans a single field value according to strict rules:
 * - Trims whitespace
 * - Converts null/undefined to empty string ''
 * - Preserves full text for phone numbers (+, leading zeros, hyphens, spaces)
 * - Keeps raw email structure
 * - No truncation of names or addresses
 */
const cleanStringValue = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Handle common stringified nulls
  if (str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'nan') {
    return '';
  }
  return str;
};

/**
 * Parses an Excel file buffer into cleaned standard row records
 */
const parseExcelBuffer = (buffer, defaultSource = '') => {
  const workbook = xlsx.read(buffer, {
    type: 'buffer',
    cellDates: true,
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel file does not contain any sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '', header: 1 });

  if (!rawRows || rawRows.length < 2) {
    return {
      headers: [],
      rows: [],
      totalRowsFound: 0,
      detectedSheetName: firstSheetName
    };
  }

  // Row 0 is header row
  const headerRow = rawRows[0];
  const headerMap = {};
  headerRow.forEach((colName, index) => {
    const normalized = normalizeHeader(colName);
    if (normalized) {
      headerMap[index] = normalized;
    }
  });

  const parsedRows = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const record = {
      name: '',
      email: '',
      contact: '',
      address: '',
      country: '',
      source_table: defaultSource || firstSheetName || 'Excel_Import'
    };

    let hasAnyData = false;

    row.forEach((cellValue, colIndex) => {
      const fieldKey = headerMap[colIndex];
      if (fieldKey && fieldKey in record) {
        const cleaned = cleanStringValue(cellValue);
        record[fieldKey] = cleaned;
        if (cleaned) hasAnyData = true;
      }
    });

    // Only include rows that have at least one non-empty value
    if (hasAnyData) {
      parsedRows.push(record);
    }
  }

  return {
    headers: Object.values(headerMap),
    rows: parsedRows,
    totalRowsFound: parsedRows.length,
    detectedSheetName: firstSheetName
  };
};

/**
 * Batch insert records into PostgreSQL in chunks (500 rows per query for maximum efficiency)
 */
const batchInsertContacts = async (records, sourceTable = 'Excel_Import') => {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      totalRows: 0,
      importedRows: 0,
      failedRows: 0,
      duplicateRows: 0,
      insertedIds: []
    };
  }

  const client = await getClient();
  let importedCount = 0;
  let failedCount = 0;
  const insertedIds = [];

  const BATCH_SIZE = 500;

  try {
    await client.query('BEGIN');

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);

      const valueStrings = [];
      const values = [];
      let paramIndex = 1;

      for (const rec of chunk) {
        const name = cleanStringValue(rec.name);
        const email = cleanStringValue(rec.email);
        const contact = cleanStringValue(rec.contact);
        const address = cleanStringValue(rec.address);
        const country = cleanStringValue(rec.country);
        const src = cleanStringValue(rec.source_table || sourceTable);

        // Skip completely empty rows
        if (!name && !email && !contact && !address && !country) {
          continue;
        }

        valueStrings.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
        );

        values.push(name, email, contact, address, country, src);
        paramIndex += 6;
      }

      if (valueStrings.length > 0) {
        const insertQuery = `
          INSERT INTO customer_contacts (name, email, contact, address, country, source_table)
          VALUES ${valueStrings.join(', ')}
          RETURNING id
        `;

        const result = await client.query(insertQuery, values);
        importedCount += result.rows.length;
        result.rows.forEach(r => insertedIds.push(r.id));
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during batch insert of contacts:', err);
    throw err;
  } finally {
    client.release();
  }

  failedCount = records.length - importedCount;

  return {
    totalRows: records.length,
    importedRows: importedCount,
    failedRows: failedCount > 0 ? failedCount : 0,
    duplicateRows: 0,
    insertedIds
  };
};

/**
 * Fetch contacts with search, country filter, pagination, and sorting
 */
const getCustomerContacts = async ({
  page = 1,
  limit = 20,
  search = '',
  country = '',
  source_table = '',
  sortBy = 'id',
  sortOrder = 'DESC'
}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const validSortCols = ['id', 'name', 'email', 'contact', 'country', 'created_at', 'source_table'];
  const sortCol = validSortCols.includes(sortBy) ? sortBy : 'id';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR contact ILIKE $${paramIdx} OR address ILIKE $${paramIdx} OR country ILIKE $${paramIdx} OR source_table ILIKE $${paramIdx})`);
    params.push(s);
    paramIdx++;
  }

  if (country && country.trim()) {
    conditions.push(`country ILIKE $${paramIdx}`);
    params.push(country.trim());
    paramIdx++;
  }

  if (source_table && source_table.trim()) {
    conditions.push(`source_table ILIKE $${paramIdx}`);
    params.push(source_table.trim());
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*)::bigint AS total FROM customer_contacts ${whereClause}`;
  const countRes = await query(countQuery, params);
  const total = parseInt(countRes.rows[0].total, 10) || 0;

  const dataQuery = `
    SELECT id, name, email, contact, address, country, source_table, created_at
    FROM customer_contacts
    ${whereClause}
    ORDER BY ${sortCol} ${order}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const dataRes = await query(dataQuery, [...params, l, offset]);

  return {
    contacts: dataRes.rows,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l)
  };
};

/**
 * Get statistical overview of contacts table
 */
const getCustomerContactsStats = async () => {
  const statsSql = `
    SELECT
      COUNT(*)::bigint AS total_contacts,
      COUNT(NULLIF(email, ''))::bigint AS total_with_email,
      COUNT(NULLIF(contact, ''))::bigint AS total_with_phone,
      COUNT(DISTINCT NULLIF(country, ''))::bigint AS total_countries,
      COUNT(DISTINCT NULLIF(source_table, ''))::bigint AS total_sources,
      MAX(created_at) AS last_import_date
    FROM customer_contacts;
  `;

  const res = await query(statsSql);
  const row = res.rows[0] || {};

  const countriesSql = `
    SELECT country, COUNT(*)::integer as count
    FROM customer_contacts
    WHERE country != ''
    GROUP BY country
    ORDER BY count DESC
    LIMIT 15;
  `;
  const countriesRes = await query(countriesSql);

  const sourcesSql = `
    SELECT source_table, COUNT(*)::integer as count
    FROM customer_contacts
    WHERE source_table != ''
    GROUP BY source_table
    ORDER BY count DESC
    LIMIT 10;
  `;
  const sourcesRes = await query(sourcesSql);

  return {
    totalContacts: parseInt(row.total_contacts, 10) || 0,
    totalWithEmail: parseInt(row.total_with_email, 10) || 0,
    totalWithPhone: parseInt(row.total_with_phone, 10) || 0,
    totalCountries: parseInt(row.total_countries, 10) || 0,
    totalSources: parseInt(row.total_sources, 10) || 0,
    lastImportDate: row.last_import_date,
    topCountries: countriesRes.rows,
    topSources: sourcesRes.rows
  };
};

/**
 * Delete a single contact
 */
const deleteContact = async (id) => {
  const res = await query('DELETE FROM customer_contacts WHERE id = $1 RETURNING id', [id]);
  return res.rows.length > 0;
};

/**
 * Bulk delete contacts by IDs
 */
const bulkDeleteContacts = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const res = await query('DELETE FROM customer_contacts WHERE id = ANY($1::bigint[]) RETURNING id', [ids]);
  return res.rows.length;
};

/**
 * Clear all customer contacts
 */
const clearAllContacts = async () => {
  await query('TRUNCATE TABLE customer_contacts RESTART IDENTITY');
  return true;
};

module.exports = {
  ensureCustomerContactsSchema,
  parseExcelBuffer,
  cleanStringValue,
  batchInsertContacts,
  getCustomerContacts,
  getCustomerContactsStats,
  deleteContact,
  bulkDeleteContacts,
  clearAllContacts
};
