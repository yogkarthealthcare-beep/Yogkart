const PDFDocument = require('pdfkit');

/**
 * Generate branded PDF Certificate Buffer for a course graduate
 * @param {Object} certData - { certificateUid, userName, courseName, issueDate }
 * @returns {Promise<Buffer>}
 */
exports.generateCertificatePdf = (certData) => {
  return new Promise((resolve, reject) => {
    try {
      // Landscape A4 PDF (841.89 x 595.28 points)
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 0
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const width = 841.89;
      const height = 595.28;

      // ── Outer Border ────────────────────────────────────────
      doc
        .rect(20, 20, width - 40, height - 40)
        .strokeColor('#0d9488')
        .lineWidth(3)
        .stroke();

      doc
        .rect(26, 26, width - 52, height - 52)
        .strokeColor('#14b8a6')
        .lineWidth(1)
        .stroke();

      // ── Header / Brand ──────────────────────────────────────
      doc
        .fillColor('#0d9488')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('YOGKART HEALTHCARE', 0, 60, { align: 'center' });

      doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica')
        .text('Authentic Ayurvedic & Yoga Learning Ecosystem', 0, 82, { align: 'center' });

      // ── Certificate Title ───────────────────────────────────
      doc
        .fillColor('#0f172a')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF COMPLETION', 0, 130, { align: 'center' });

      doc
        .fillColor('#64748b')
        .fontSize(11)
        .font('Helvetica-Oblique')
        .text('This is proudly presented to', 0, 175, { align: 'center' });

      // ── Student Name ────────────────────────────────────────
      doc
        .fillColor('#0d9488')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(certData.userName || 'Student', 0, 210, { align: 'center' });

      doc
        .moveTo(220, 245)
        .lineTo(width - 220, 245)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor('#64748b')
        .fontSize(11)
        .font('Helvetica-Oblique')
        .text('for successfully completing the certification course', 0, 260, { align: 'center' });

      // ── Course Title ────────────────────────────────────────
      doc
        .fillColor('#1e293b')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(`"${certData.courseName}"`, 0, 290, { align: 'center' });

      // ── Date & Verification Details ────────────────────────
      const formattedDate = new Date(certData.issueDate || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica')
        .text(`Issued On: ${formattedDate}`, 0, 340, { align: 'center' });

      doc
        .fillColor('#0d9488')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Certificate ID: ${certData.certificateUid}`, 0, 360, { align: 'center' });

      // ── Footer Signatures & QR Note ─────────────────────────
      const footerY = 460;

      // Sign 1
      doc
        .moveTo(120, footerY)
        .lineTo(260, footerY)
        .strokeColor('#94a3b8')
        .stroke();

      doc
        .fillColor('#1e293b')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Academic Director', 120, footerY + 8, { width: 140, align: 'center' })
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text('Yogkart Education Board', 120, footerY + 22, { width: 140, align: 'center' });

      // QR Verification Note Badge (Center)
      const verifyUrl = `${process.env.FRONTEND_URL || 'https://www.yogkart.in'}/verify-certificate?uid=${certData.certificateUid}`;
      doc
        .rect(340, footerY - 20, 160, 50)
        .fill('#f0fdf4');

      doc
        .fillColor('#15803d')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('VERIFIED CREDENTIAL', 340, footerY - 12, { width: 160, align: 'center' })
        .font('Helvetica')
        .fillColor('#166534')
        .text(`Verify online at:\n${verifyUrl}`, 340, footerY, { width: 160, align: 'center' });

      // Sign 2
      doc
        .moveTo(580, footerY)
        .lineTo(720, footerY)
        .strokeColor('#94a3b8')
        .stroke();

      doc
        .fillColor('#1e293b')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Head Registrar', 580, footerY + 8, { width: 140, align: 'center' })
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text('Yogkart Healthcare Pvt Ltd', 580, footerY + 22, { width: 140, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
