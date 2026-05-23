/**
 * utils/response.js  (FIXED)
 * ─────────────────────────────────────────────────────────────────────
 * Fix: paginated() ab data ko { orders/products/etc } wrap karne ki
 * jagah flat array return karta hai PLUS total field top-level pe —
 * Angular AdminDataService ko yahi format chahiye.
 *
 * Response shape:
 * {
 *   success: true,
 *   message: "...",
 *   data:    [...] or { key: [...] },
 *   total:   150,
 *   pagination: { page, limit, totalPages, hasNext, hasPrev }
 * }
 */

const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403);
};

const badRequest = (res, message = 'Bad request', errors = null) => {
  return error(res, message, 400, errors);
};

/**
 * paginated — Angular AdminDataService ke saath compatible
 * data: array of records
 * total: total count (for pagination)
 * Angular side pe: res.data (array), res.total (number)
 */
const paginated = (res, data, total, page, limit, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,                        // ← flat array, Angular directly use karta hai
    total: parseInt(total),      // ← top-level total for pagination
    pagination: {
      total:      parseInt(total),
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext:    parseInt(page) * parseInt(limit) < parseInt(total),
      hasPrev:    parseInt(page) > 1,
    },
  });
};

module.exports = {
  success,
  created,
  error,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  paginated,
};
