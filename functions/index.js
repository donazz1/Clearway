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

    // Defensive field lookups — Veryfi's exact response shape wasn't fully confirmable
    // from public docs alone, so this checks a few plausible field names per value
    // rather than trusting one. First real scan against a live receipt should confirm
    // (or correct) these against request.data.debug below.
    const taxes = Array.isArray(data.tax_lines) && data.tax_lines.length
      ? data.tax_lines.map(t => ({ label: t.name || t.code || 'Tax', amount: Number(t.total ?? t.amount ?? 0) }))
      : (typeof data.tax === 'number' && data.tax ? [{ label: 'Tax', amount: data.tax }] : []);

    return {
      amount: typeof data.total === 'number' ? data.total : null,
      taxes,
      tip: typeof data.tip === 'number' ? data.tip : null,
      merchant: (data.vendor && data.vendor.name) || data.vendor_name || data.raw_vendor_name || '',
      date: (data.date || '').slice(0, 10) || null,
      rawText: data.ocr_text || '',
      _raw: data // kept temporarily so the first live test can confirm field names are right
    };
  }
);
