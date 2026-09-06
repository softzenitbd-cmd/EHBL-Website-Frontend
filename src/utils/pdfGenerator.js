// We are dropping html2pdf.js because it fundamentally conflicts with this React DOM
// and hangs infinitely, which causes the UI to break and the PDF to be blank.
// Instead, we use a bulletproof hidden iframe approach for native Print-to-PDF.

import { pdfDocumentCss } from './printStyles';

export const downloadAsPDF = (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    alert('Error: Could not find the content to download.');
    return;
  }
  
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  
  const content = element.innerHTML;
  const doc = iframe.contentWindow.document;
  
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>${pdfDocumentCss()}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
  doc.close();
  
  // Trigger the print dialog safely
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Cleanup after print dialog closes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 250);
};
