const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const VERYFI_CLIENT_ID = defineSecret('VERYFI_CLIENT_ID');
const VERYFI_USERNAME = defineSecret('VERYFI_USERNAME');
const VERYFI_API_KEY = defineSecret('VERYFI_API_KEY');

// Receives a receipt photo from a signed-in Clearway user, sends it to Veryfi's OCR
// API (the only place these credentials ever touch — never the browser), and hands
// back a shape close to what parseReceiptText() already produces client-side, so the
// existing category-guessing logic (guessBucket, against the user's own catOrder)
// keeps working unchanged on top of this — only the OCR/field-extraction layer moves.
exports.scanReceipt = onCall(
  { secrets: [VERYFI_CLIENT_ID, VERYFI_USERNAME, VERYFI_API_KEY], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const imageBase64 = request.data && request.data.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    let res;
    try {
      res = await fetch('https://api.veryfi.com/api/v8/partner/documents/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Id': VERYFI_CLIENT_ID.value(),
          'Authorization': `apikey ${VERYFI_USERNAME.value()}:${VERYFI_API_KEY.value()}`
        },
        body: JSON.stringify({ file_data: imageBase64 })
      });
    } catch (e) {
      throw new HttpsError('unavailable', 'Could not reach Veryfi: ' + e.message);
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      throw new HttpsError('internal', `Veryfi returned ${res.status}: ${bodyText.slice(0, 300)}`);
    }

    const data = await res.json();
    logger.info('Veryfi response', { keys: Object.keys(data), data });

    const ocrText = data.ocr_text || '';

    // The receipt's real, final charge — used only to derive tax below when Veryfi's own
    // tax_lines come back empty. The OCR text usually has this on a "total paid" line even
    // when data.total itself is unreliable (confirmed on a real receipt where data.total
    // actually held the subtotal, not the total).
    function extractTotalFromText(text) {
      const patterns = [
        /total\s*paid[:\s]*\$?\s*([\d,]+\.\d{2})/i,
        /amount\s*paid[:\s]*\$?\s*([\d,]+\.\d{2})/i,
        /amount\s*charged[:\s]*\$?\s*([\d,]+\.\d{2})/i
      ];
      for (const p of patterns) {
        const m = text.match(p);
        if (m) return parseFloat(m[1].replace(/,/g, ''));
      }
      return null;
    }
    const subtotal = typeof data.subtotal === 'number' ? data.subtotal : null;
    const receiptTotal = extractTotalFromText(ocrText) ?? (typeof data.total === 'number' ? data.total : null);

    // Clearway's "amount" is the PRE-TAX base — tax and tip get added back on top
    // client-side into the displayed Total, so this must never be the receipt's
    // tax-inclusive grand total (confirmed on a real receipt: using the grand total here
    // double-counted the tax once the client added it again — 22.59 + 2.60 = 25.19
    // instead of the real 22.59). Subtotal is the correct field; only fall back to
    // whatever total figure exists if Veryfi genuinely didn't extract a subtotal at all.
    const amount = subtotal ?? receiptTotal;

    // Tax: prefer Veryfi's own structured tax lines (can be more than one — HST + a
    // second provincial line, both confirmed coming through correctly on a real receipt).
    // When those come back empty, the gap between the real total and the subtotal is the
    // tax, even when Veryfi couldn't isolate the individual line itself.
    let taxes = Array.isArray(data.tax_lines) && data.tax_lines.length
      ? data.tax_lines.map(t => ({ label: t.name || t.code || 'Tax', amount: Number(t.total ?? t.amount ?? 0) }))
      : [];
    if (!taxes.length && typeof data.tax === 'number' && data.tax > 0) {
      taxes = [{ label: 'Tax', amount: data.tax }];
    }
    if (!taxes.length && subtotal != null && receiptTotal != null) {
      const implied = Math.round((receiptTotal - subtotal) * 100) / 100;
      if (implied > 0.01) taxes = [{ label: 'Tax', amount: implied }];
    }

    return {
      amount,
      taxes,
      tip: typeof data.tip === 'number' ? data.tip : null,
      merchant: (data.vendor && data.vendor.name) || data.vendor_name || data.raw_vendor_name || '',
      date: (data.date || '').slice(0, 10) || null,
      category: data.category || null, // Veryfi's own taxonomy, e.g. "Meals & Entertainment" — mapped client-side
      rawText: ocrText
    };
  }
);
