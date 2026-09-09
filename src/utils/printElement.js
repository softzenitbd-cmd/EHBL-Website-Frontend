/**
 * Clean isolated iframe print utility for invoices and documents.
 * Renders document HTML into a dedicated hidden iframe, waits for images (logo, etc.)
 * to finish loading, and opens native print preview.
 *
 * Guarantees:
 * 1. Zero page reload (React DOM, state, and event listeners stay untouched).
 * 2. No blank page (the iframe remains alive and fully rendered in the background).
 * 3. Proportions are preserved cleanly (centered, standard max-width, matching preview).
 */
export const printElement = (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  // Remove existing print iframe if present
  const oldIframe = document.getElementById('ehbl-print-frame');
  if (oldIframe) {
    oldIframe.remove();
  }

  // Create an off-screen iframe (positioned offscreen so layout engine calculates font and image metrics)
  const iframe = document.createElement('iframe');
  iframe.id = 'ehbl-print-frame';
  iframe.setAttribute(
    'style',
    'position: fixed; top: -10000px; left: -10000px; width: 1024px; height: 1000px; border: 0; visibility: hidden;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Invoice</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Outfit', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            font-size: 13px;
          }
          .print-document-container {
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
            padding: 10px 15px;
            box-sizing: border-box;
          }
          .printable-invoice-wrapper {
            width: 100% !important;
            max-width: 680px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          table {
            border-collapse: collapse;
          }
          .common-print-footer {
            display: block !important;
            margin-top: 1.5rem;
            padding-top: 0.75rem;
            font-size: 0.75rem;
            line-height: 1.4;
            color: #334155;
            text-align: left;
            border-top: 1px dashed #cbd5e1;
          }
          .common-print-footer p {
            margin: 0 0 3px 0;
          }
          .common-print-footer .footer-phone {
            font-weight: 700;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div class="print-document-container">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    // Small delay for browser rendering engine to layout styles & fonts
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print failed:', err);
      }
    }, 150);
  };

  // Ensure all images (logo, barcodes, etc.) are loaded before triggering print
  const images = doc.images;
  if (images && images.length > 0) {
    let loaded = 0;
    const total = images.length;
    const onImgDone = () => {
      loaded++;
      if (loaded >= total) {
        triggerPrint();
      }
    };
    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        onImgDone();
      } else {
        images[i].onload = onImgDone;
        images[i].onerror = onImgDone;
      }
    }
  } else {
    triggerPrint();
  }
};

export default printElement;
