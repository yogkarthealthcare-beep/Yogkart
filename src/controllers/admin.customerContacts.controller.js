const customerContactsService = require('../services/customerContacts.service');
const { success, error, badRequest } = require('../utils/response');

/**
 * Upload & Import Excel file directly into PostgreSQL
 * POST /api/admin/customer-contacts/import
 */
const importExcel = async (req, res) => {
  try {
    const sourceTable = req.body.source_table || req.body.source || (req.file ? req.file.originalname.replace(/\.[^/.]+$/, '') : 'Excel_Import');

    // Case 1: File uploaded via multipart/form-data
    if (req.file) {
      const buffer = req.file.buffer;
      if (!buffer || buffer.length === 0) {
        return badRequest(res, 'Uploaded Excel file is empty');
      }

      // Check file extension
      const originalName = req.file.originalname || '';
      if (!originalName.match(/\.(xlsx|xls|csv)$/i)) {
        return badRequest(res, 'Invalid file format. Please upload a valid .xlsx or .xls Excel file');
      }

      const parsed = customerContactsService.parseExcelBuffer(buffer, sourceTable);

      if (!parsed.rows || parsed.rows.length === 0) {
        return badRequest(res, 'No readable data rows found in the uploaded Excel file');
      }

      const summary = await customerContactsService.batchInsertContacts(parsed.rows, sourceTable);

      return success(res, 'Excel data imported successfully', {
        summary: {
          totalRows: summary.totalRows,
          importedRows: summary.importedRows,
          failedRows: summary.failedRows,
          duplicateRows: summary.duplicateRows || 0,
          sourceTable: sourceTable
        },
        detectedHeaders: parsed.headers,
        sheetName: parsed.detectedSheetName
      });
    }

    // Case 2: Array of rows provided in JSON body
    if (req.body.rows && Array.isArray(req.body.rows)) {
      const rows = req.body.rows;
      if (rows.length === 0) {
        return badRequest(res, 'Rows array cannot be empty');
      }

      const summary = await customerContactsService.batchInsertContacts(rows, sourceTable);

      return success(res, 'Customer contacts imported successfully', {
        summary: {
          totalRows: summary.totalRows,
          importedRows: summary.importedRows,
          failedRows: summary.failedRows,
          duplicateRows: summary.duplicateRows || 0,
          sourceTable: sourceTable
        }
      });
    }

    return badRequest(res, 'Please provide an Excel file (.xlsx / .xls) or a JSON rows array');
  } catch (err) {
    console.error('❌ Error importing customer contacts:', err);
    return error(res, `Failed to import contacts: ${err.message}`, 500);
  }
};

/**
 * Preview Excel file without inserting into DB
 * POST /api/admin/customer-contacts/preview
 */
const previewExcel = async (req, res) => {
  try {
    if (!req.file) {
      return badRequest(res, 'Please select an Excel file to preview');
    }

    const originalName = req.file.originalname || '';
    if (!originalName.match(/\.(xlsx|xls|csv)$/i)) {
      return badRequest(res, 'Invalid file format. Please upload a valid .xlsx or .xls Excel file');
    }

    const defaultSource = originalName.replace(/\.[^/.]+$/, '');
    const parsed = customerContactsService.parseExcelBuffer(req.file.buffer, defaultSource);

    return success(res, 'Excel parsed successfully', {
      totalRows: parsed.totalRowsFound,
      previewRows: parsed.rows.slice(0, 50),
      detectedHeaders: parsed.headers,
      sheetName: parsed.detectedSheetName,
      sourceTable: defaultSource
    });
  } catch (err) {
    console.error('❌ Error previewing Excel file:', err);
    return error(res, `Failed to preview Excel file: ${err.message}`, 500);
  }
};

/**
 * Batch Insert pre-verified rows
 * POST /api/admin/customer-contacts/batch
 */
const batchInsert = async (req, res) => {
  try {
    const { rows, source_table } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return badRequest(res, 'Rows array is required and cannot be empty');
    }

    const summary = await customerContactsService.batchInsertContacts(rows, source_table || 'Excel_Import');
    return success(res, 'Customer contacts batch imported successfully', { summary });
  } catch (err) {
    console.error('❌ Error during batch insert:', err);
    return error(res, `Batch insert failed: ${err.message}`, 500);
  }
};

/**
 * List paginated customer contacts
 * GET /api/admin/customer-contacts
 */
const getContacts = async (req, res) => {
  try {
    const { page, limit, search, country, source_table, sortBy, sortOrder } = req.query;

    const data = await customerContactsService.getCustomerContacts({
      page,
      limit,
      search,
      country,
      source_table,
      sortBy,
      sortOrder
    });

    return success(res, 'Customer contacts fetched successfully', data);
  } catch (err) {
    console.error('❌ Error fetching customer contacts:', err);
    return error(res, 'Failed to fetch customer contacts', 500);
  }
};

/**
 * Statistical summary
 * GET /api/admin/customer-contacts/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await customerContactsService.getCustomerContactsStats();
    return success(res, 'Customer contacts stats fetched successfully', stats);
  } catch (err) {
    console.error('❌ Error fetching stats:', err);
    return error(res, 'Failed to fetch stats', 500);
  }
};

/**
 * Delete single contact
 * DELETE /api/admin/customer-contacts/:id
 */
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await customerContactsService.deleteContact(id);
    if (!deleted) {
      return badRequest(res, 'Contact not found or already deleted');
    }
    return success(res, 'Contact deleted successfully', { id });
  } catch (err) {
    console.error('❌ Error deleting contact:', err);
    return error(res, 'Failed to delete contact', 500);
  }
};

/**
 * Bulk delete contacts
 * POST /api/admin/customer-contacts/delete-bulk
 */
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, 'IDs array is required');
    }

    const count = await customerContactsService.bulkDeleteContacts(ids);
    return success(res, `${count} contacts deleted successfully`, { deletedCount: count });
  } catch (err) {
    console.error('❌ Error during bulk delete:', err);
    return error(res, 'Failed to bulk delete contacts', 500);
  }
};

/**
 * Clear all contacts
 * DELETE /api/admin/customer-contacts/clear-all
 */
const clearAll = async (req, res) => {
  try {
    await customerContactsService.clearAllContacts();
    return success(res, 'All customer contacts cleared successfully');
  } catch (err) {
    console.error('❌ Error clearing contacts:', err);
    return error(res, 'Failed to clear contacts table', 500);
  }
};

module.exports = {
  importExcel,
  previewExcel,
  batchInsert,
  getContacts,
  getStats,
  deleteContact,
  bulkDelete,
  clearAll
};
