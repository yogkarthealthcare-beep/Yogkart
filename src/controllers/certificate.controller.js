const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const certService = require('../services/certificate.service');

/**
 * GET /api/certificates/verify/:uid
 * PUBLIC endpoint to verify certificate authenticity
 */
exports.verifyCertificate = async (req, res) => {
  try {
    const { uid } = req.params;
    const cleanUid = String(uid || '').trim().toUpperCase();

    const certRes = await db.query(
      `SELECT c.certificate_uid, c.user_name, c.course_name, c.issue_date, c.created_at
       FROM certificates c
       WHERE UPPER(c.certificate_uid) = $1`,
      [cleanUid]
    );

    if (certRes.rows.length === 0) {
      return successResponse(res, { is_valid: false }, 'Invalid Certificate ID', 200);
    }

    const cert = certRes.rows[0];

    return successResponse(res, {
      is_valid: true,
      certificate: {
        certificate_uid: cert.certificate_uid,
        student_name: cert.user_name,
        course_title: cert.course_name,
        issue_date: cert.issue_date,
        issued_by: 'Yogkart Healthcare Private Limited'
      }
    }, 'Certificate is authentic and valid');
  } catch (error) {
    console.error('verifyCertificate error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/certificates/:uid/pdf
 * Download PDF Certificate
 */
exports.downloadCertificatePdf = async (req, res) => {
  try {
    const { uid } = req.params;
    const cleanUid = String(uid || '').trim().toUpperCase();

    const certRes = await db.query(
      `SELECT * FROM certificates WHERE UPPER(certificate_uid) = $1`,
      [cleanUid]
    );

    if (certRes.rows.length === 0) {
      return errorResponse(res, 'Certificate not found', 404);
    }

    const cert = certRes.rows[0];

    const pdfBuffer = await certService.generateCertificatePdf({
      certificateUid: cert.certificate_uid,
      userName: cert.user_name,
      courseName: cert.course_name,
      issueDate: cert.issue_date
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate_${cert.certificate_uid}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('downloadCertificatePdf error:', error);
    return errorResponse(res, 'Failed to generate certificate PDF', 500);
  }
};

/**
 * GET /api/certificates/my
 * List logged-in user's earned certificates
 */
exports.getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;

    const certRes = await db.query(
      `SELECT certificate_uid, course_name, issue_date, created_at
       FROM certificates
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return successResponse(res, { certificates: certRes.rows }, 'Certificates fetched');
  } catch (error) {
    console.error('getMyCertificates error:', error);
    return errorResponse(res, error.message, 500);
  }
};
