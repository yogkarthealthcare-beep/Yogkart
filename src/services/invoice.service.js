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
      const primaryColor = '#065f46';   // Emerald-800
      const secondaryColor = '#000000'; // Pure Black
      const darkColor = '#111827';      // Gray-900
      const textGray = '#1f2937';       // Dark charcoal text

      // ── Header / Brand Banner ──────────────────────────────
      doc
        .fillColor(primaryColor)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('YOGKART HEALTHCARE', 40, 40);

      doc
        .fillColor(textGray)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Yogkart Healthcare Private Limited', 40, 68)
        .font('Helvetica')
        .text('Email: support@yogkart.com | Web: www.yogkart.com', 40, 80);

      // Invoice Title Badge
      doc
        .fillColor(secondaryColor)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 400, 40, { align: 'right' });

      doc
        .fillColor(darkColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Invoice No: INV-${order.id}`, 400, 65, { align: 'right' })
        .font('Helvetica')
        .text(`Order Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 400, 80, { align: 'right' })
        .text(`Payment: ${(order.payment_method || 'ONLINE').toUpperCase()}`, 400, 95, { align: 'right' })
        .font('Helvetica-Bold')
        .text(`Status: ${(order.payment_status || 'PAID').toUpperCase()}`, 400, 110, { align: 'right' });

      // Line separator (Bold & Dark)
      doc
        .moveTo(40, 130)
        .lineTo(555, 130)
        .strokeColor('#000000')
        .lineWidth(2)
        .stroke();

      // ── Customer / Shipping Address ─────────────────────────
      doc
        .fillColor(secondaryColor)
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
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text(`Phone: ${customerPhone}`, 40, 175)
        .font('Helvetica')
        .text(addressStr || 'Address Not Provided', 40, 190, { width: 300 });

      // ── Items Table Header ──────────────────────────────────
      let tableTop = 230;
      doc
        .rect(40, tableTop, 515, 24)
        .fill('#111827');

      doc
        .fillColor('#ffffff')
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
          .font('Helvetica-Bold')
          .text(sr.toString(), 50, y)
          .text(item.name || 'Product Item', 80, y, { width: 190 })
          .font('Helvetica')
          .text(item.pack_size || item.attribute_value || '-', 280, y)
          .font('Helvetica-Bold')
          .text(item.quantity.toString(), 370, y)
          .text(itemPrice.toFixed(2), 420, y)
          .text(itemTotal.toFixed(2), 490, y);

        // Sub row line
        doc
          .moveTo(40, y + 16)
          .lineTo(555, y + 16)
          .strokeColor('#e2e8f0')
          .lineWidth(0.8)
          .stroke();

        y += 24;
        sr++;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      // Line separator below items (Bold & Dark)
      doc
        .moveTo(40, y + 5)
        .lineTo(555, y + 5)
        .strokeColor('#000000')
        .lineWidth(2)
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
        .font('Helvetica-Bold')
        .fillColor(darkColor)
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
        .rect(350, summaryY - 4, 205, 24)
        .fill('#065f46');

      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Grand Total:', summaryXLabel + 5, summaryY + 3)
        .text(`Rs. ${grandTotal.toFixed(2)}`, summaryXVal, summaryY + 3);

      // ── Footer ──────────────────────────────────────────────
      doc
        .fillColor(secondaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('This is a computer-generated tax invoice and does not require a physical signature.', 40, 780, { align: 'center' })
        .text('Thank you for shopping with Yogkart Healthcare! | www.yogkart.com', 40, 792, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
