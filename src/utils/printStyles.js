/**
 * One source of truth for the printed page.
 *
 * The shop prints everything on A5. This used to be declared in four separate
 * places that had drifted apart - the invoice said B5, the stock register said
 * A4, the PDF download said A4 portrait, and the global stylesheet said A5 - so
 * whatever came out of the printer was scaled or clipped depending on which
 * button was pressed. Anything that writes an @page rule must take it from here.
 *
 * The one place this cannot be imported is src/index.css, which carries the
 * same values by hand; keep the two in step.
 */
export const PAGE_SIZE = 'A5';
export const PAGE_MARGIN = '10mm';

/** The @page rule on its own, for blocks that only need the paper size. */
export const pageRule = (orientation = 'portrait') =>
  `@page { size: ${PAGE_SIZE} ${orientation}; margin: ${PAGE_MARGIN}; }`;

/**
 * Type and spacing tuned for A5. A5 is 148mm wide, so with 10mm margins there
 * are about 128mm to work with - roughly half the usable width of A4. Tables
 * laid out for A4 overflow and get clipped, so cells are tightened and given a
 * fixed layout that wraps instead of pushing the table wider than the sheet.
 */
export const A5_CONTENT_CSS = `
  body, #print-wrapper { font-size: 11px; line-height: 1.35; }

  /* Several printable blocks carry an inline padding of 1.5-2rem, which was
     fine on A4 but doubles up on the @page margin and eats an eighth of the A5
     width. The sheet margin is the only one that should apply. */
  #print-wrapper > div, body > div { padding-left: 0 !important; padding-right: 0 !important; }

  h1 { font-size: 15px; margin: 0 0 6px; }
  h2 { font-size: 14px; margin: 0 0 6px; }
  h3 { font-size: 12.5px; margin: 0 0 5px; }
  h4, h5 { font-size: 11.5px; margin: 0 0 4px; }
  p { margin: 0 0 4px; }

  table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed; }
  th, td {
    font-size: 10px !important;
    padding: 3px 4px !important;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`;

/** Full print stylesheet for the hidden iframe the PDF download writes into. */
export const pdfDocumentCss = () => `
  ${pageRule()}
  body {
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    padding: 0;
    background: #fff;
    color: #000;
  }
  ${A5_CONTENT_CSS}
  th { background-color: #f4f6f8; font-weight: bold; color: #333; }
  th, td { border: 1px solid #999; text-align: left; }
  h2, h3, p { text-align: center; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }

  .common-print-footer {
    margin-top: 12px;
    padding-top: 6px;
    font-size: 9px;
    line-height: 1.35;
    color: #000;
    page-break-inside: avoid;
  }
  .common-print-footer p { margin: 0 0 2px 0; }
  .common-print-footer .footer-phone { font-weight: bold; margin-top: 3px; }
`;
