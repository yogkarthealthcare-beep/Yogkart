const PDFDocument = require('pdfkit');

/**
 * Generate PDF Invoice Buffer for a given Order and its items
 * @param {Object} order - Order record from DB
 * @param {Array} items - Order items from DB
 * @returns {Promise<Buffer>} - Resolves with PDF Buffer
 */
exports.generateInvoicePdf = (order, items = []) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // ── Color Palette ───────────────────────────────────────
      const primaryColor = '#0d9488';   // Teal-600
      const secondaryColor = '#1e293b'; // Slate-800
      const lightGray = '#f8fafc';      // Slate-50
      const textGray = '#475569';       // Slate-600

      // ── Header / Brand Banner ──────────────────────────────
      doc
        .fillColor(primaryColor)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('YOGKART HEALTHCARE', 40, 40);

      doc
        .fillColor(textGray)
        .fontSize(9)
        .font('Helvetica')
        .text('Yogkart Healthcare Private Limited', 40, 68)
        .text('Email: support@yogkart.in | Web: www.yogkart.in', 40, 80);

      // Invoice Title Badge
      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 400, 40, { align: 'right' });

      doc
        .fillColor(secondaryColor)
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice No: INV-${order.id}`, 400, 65, { align: 'right' })
        .text(`Order Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 400, 80, { align: 'right' })
        .text(`Payment Method: ${(order.payment_method || 'ONLINE').toUpperCase()}`, 400, 95, { align: 'right' })
        .text(`Payment Status: ${(order.payment_status || 'PAID').toUpperCase()}`, 400, 110, { align: 'right' });

      // Line separator
      doc
        .moveTo(40, 130)
        .lineTo(555, 130)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      // ── Customer / Shipping Address ─────────────────────────
      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Billed & Shipped To:', 40, 145);

      const customerName = order.address_name || order.user_name || 'Customer';
      const customerPhone = order.address_phone || order.user_phone || '';
      const addressStr = [
        order.address_line1,
        order.address_city,
        order.address_state,
        order.address_pincode ? `Pincode: ${order.address_pincode}` : null
      ].filter(Boolean).join(', ');

      doc
        .fillColor(secondaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(customerName, 40, 160)
        .font('Helvetica')
        .fillColor(textGray)
        .text(`Phone: ${customerPhone}`, 40, 175)
        .text(addressStr || 'Address Not Provided', 40, 190, { width: 300 });

      // ── Items Table Header ──────────────────────────────────
      let tableTop = 230;
      doc
        .rect(40, tableTop, 515, 24)
        .fill('#e6fffa');

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('SR', 50, tableTop + 7)
        .text('ITEM DESCRIPTION', 80, tableTop + 7)
        .text('PACK / SKU', 280, tableTop + 7)
        .text('QTY', 370, tableTop + 7)
        .text('PRICE (INR)', 420, tableTop + 7)
        .text('TOTAL (INR)', 490, tableTop + 7);

      // ── Table Rows ──────────────────────────────────────────
      let y = tableTop + 30;
      let sr = 1;

      for (const item of items) {
        const itemPrice = parseFloat(item.price || 0);
        const itemTotal = parseFloat(item.total || itemPrice * item.quantity);

        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(sr.toString(), 50, y)
          .text(item.name || 'Product Item', 80, y, { width: 190 })
          .text(item.pack_size || item.attribute_value || '-', 280, y)
          .text(item.quantity.toString(), 370, y)
          .text(itemPrice.toFixed(2), 420, y)
          .text(itemTotal.toFixed(2), 490, y);

        y += 22;
        sr++;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      // Line separator below items
      doc
        .moveTo(40, y + 5)
        .lineTo(555, y + 5)
        .strokeColor('#e2e8f0')
        .stroke();

      // ── Totals Summary ──────────────────────────────────────
      let summaryY = y + 15;
      const subtotal = parseFloat(order.subtotal || 0);
      const discount = parseFloat(order.discount || order.coupon_discount || 0);
      const deliveryFee = parseFloat(order.delivery_fee || 0);
      const tax = parseFloat(order.tax || 0);
      const grandTotal = parseFloat(order.total || 0);

      const summaryXLabel = 360;
      const summaryXVal = 490;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(textGray)
        .text('Subtotal:', summaryXLabel, summaryY)
        .text(`Rs. ${subtotal.toFixed(2)}`, summaryXVal, summaryY);

      if (discount > 0) {
        summaryY += 15;
        doc
          .text('Discount:', summaryXLabel, summaryY)
          .text(`- Rs. ${discount.toFixed(2)}`, summaryXVal, summaryY);
      }

      if (deliveryFee >= 0) {
        summaryY += 15;
        doc
          .text('Delivery Fee:', summaryXLabel, summaryY)
          .text(deliveryFee === 0 ? 'FREE' : `Rs. ${deliveryFee.toFixed(2)}`, summaryXVal, summaryY);
      }

      if (tax > 0) {
        summaryY += 15;
        doc
          .text('Taxes (GST):', summaryXLabel, summaryY)
          .text(`Rs. ${tax.toFixed(2)}`, summaryXVal, summaryY);
      }

      summaryY += 20;
      doc
        .rect(350, summaryY - 4, 205, 22)
        .fill('#0d9488');

      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Total Amount Paid:', summaryXLabel + 5, summaryY + 2)
        .text(`Rs. ${grandTotal.toFixed(2)}`, summaryXVal, summaryY + 2);

      // ── Footer ──────────────────────────────────────────────
      doc
        .fillColor(textGray)
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text('This is a computer-generated tax invoice and does not require a physical signature.', 40, 780, { align: 'center' })
        .text('Thank you for shopping with Yogkart Healthcare!', 40, 792, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
