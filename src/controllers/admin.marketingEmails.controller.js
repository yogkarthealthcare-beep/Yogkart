const xlsx = require('xlsx');
const service = require('../services/marketingEmails.service');
const { success, error, notFound } = require('../utils/response');

/**
 * Previews uploaded Excel/CSV file without saving to DB
 */
const previewExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return error(res, 'Please upload an Excel (.xlsx, .xls) or CSV file', 400);
    }

    const previewData = await service.previewExcelBuffer(req.file.buffer);
    return success(res, previewData, 'File parsed successfully for preview');
  } catch (err) {
    console.error('Error previewing Excel file:', err);
    return error(res, err.message || 'Failed to parse Excel file', 400);
  }
};

/**
 * Batch imports records into marketing_emails table
 */
const importRecords = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return error(res, 'No records provided for import', 400);
    }

    const result = await service.importMarketingEmailRecords(records);
    return success(res, result, `Successfully imported ${result.importedCount} new email records`);
  } catch (err) {
    console.error('Error importing marketing email records:', err);
    return error(res, err.message || 'Failed to import records', 500);
  }
};

/**
 * Paginated fetch of marketing emails with search & filters
 */
const getMarketingEmails = async (req, res) => {
  try {
    const { page, limit, search, status, country, sortBy, sortOrder } = req.query;
    const data = await service.getMarketingEmails({
      page,
      limit,
      search,
      status,
      country,
      sortBy,
      sortOrder,
    });
    return success(res, data);
  } catch (err) {
    console.error('Error getting marketing emails:', err);
    return error(res, 'Failed to fetch marketing email records', 500);
  }
};

/**
 * Gets marketing emails KPI dashboard stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await service.getMarketingEmailStats();
    return success(res, stats);
  } catch (err) {
    console.error('Error getting marketing email stats:', err);
    return error(res, 'Failed to fetch marketing email statistics', 500);
  }
};

/**
 * Sends bulk marketing emails with duplicate prevention & concurrency safety
 */
const sendBulk = async (req, res) => {
  try {
    const { target, ids, subject, htmlContent, campaignName } = req.body;
    if (!subject || !subject.trim()) {
      return error(res, 'Email Subject is required', 400);
    }
    if (!htmlContent || !htmlContent.trim()) {
      return error(res, 'Email Body content is required', 400);
    }

    const result = await service.sendBulkMarketingEmails({
      target,
      ids,
      subject,
      htmlContent,
      campaignName,
    });

    return success(res, result, `Processed campaign: ${result.sentCount} sent, ${result.skippedCount} already sent/skipped, ${result.failedCount} failed`);
  } catch (err) {
    console.error('Error sending bulk marketing emails:', err);
    return error(res, err.message || 'Failed to send bulk marketing emails', 500);
  }
};

/**
 * Exports marketing emails to Excel file download
 */
const exportToExcel = async (req, res) => {
  try {
    const { status, country, search, ids } = req.query;
    let parsedIds = [];
    if (ids) {
      parsedIds = String(ids).split(',').map(id => id.trim()).filter(Boolean);
    }

    const records = await service.getExportRecords({
      status,
      country,
      search,
      ids: parsedIds,
    });

    const exportRows = records.map((r, idx) => ({
      'S.No.': idx + 1,
      'Name': r.name || '',
      'Email': r.email,
      'Contact': r.contact || '',
      'Address': r.address || '',
      'Country': r.country || '',
      'Status': r.status,
      'Sent At': r.sent_at ? new Date(r.sent_at).toLocaleString() : '',
      'Imported At': r.created_at ? new Date(r.created_at).toLocaleString() : '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Marketing Emails');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Yogkart_Marketing_Emails_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('Error exporting marketing emails:', err);
    return error(res, 'Failed to export marketing emails', 500);
  }
};

/**
 * Updates a single marketing email record
 */
const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await service.updateMarketingEmail(id, req.body);
    return success(res, updated, 'Marketing email updated successfully');
  } catch (err) {
    console.error('Error updating marketing email:', err);
    return error(res, err.message || 'Failed to update record', 400);
  }
};

/**
 * Deletes a single record
 */
const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await service.deleteMarketingEmail(id);
    if (!deleted) {
      return notFound(res, 'Record not found');
    }
    return success(res, null, 'Marketing email deleted successfully');
  } catch (err) {
    console.error('Error deleting marketing email:', err);
    return error(res, 'Failed to delete record', 500);
  }
};

/**
 * Bulk deletes records
 */
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return error(res, 'No record IDs provided for deletion', 400);
    }

    const count = await service.bulkDeleteMarketingEmails(ids);
    return success(res, { count }, `Successfully deleted ${count} records`);
  } catch (err) {
    console.error('Error bulk deleting marketing emails:', err);
    return error(res, 'Failed to delete selected records', 500);
  }
};

/**
 * Resets status to 'Pending'
 */
const resetStatus = async (req, res) => {
  try {
    const { ids } = req.body;
    const count = await service.resetMarketingEmailStatus(ids);
    return success(res, { count }, `Reset status to Pending for ${count} records`);
  } catch (err) {
    console.error('Error resetting status:', err);
    return error(res, 'Failed to reset status', 500);
  }
};

/**
 * Removes duplicate email entries from database
 */
const removeDuplicates = async (req, res) => {
  try {
    const count = await service.removeDuplicateEmails();
    const msg = count > 0
      ? `Successfully removed ${count} duplicate email record(s).`
      : 'No duplicate emails found. All records are unique.';
    return success(res, { count }, msg);
  } catch (err) {
    console.error('Error removing duplicate marketing emails:', err);
    return error(res, 'Failed to remove duplicate emails', 500);
  }
};

module.exports = {
  previewExcel,
  importRecords,
  getMarketingEmails,
  getStats,
  sendBulk,
  exportToExcel,
  updateRecord,
  deleteRecord,
  bulkDelete,
  resetStatus,
  removeDuplicates,
};
