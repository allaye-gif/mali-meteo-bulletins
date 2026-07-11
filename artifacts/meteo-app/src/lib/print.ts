/**
 * printBulletin — clone the bulletin preview into a clean new window
 * (no Replit dev banner, no UI chrome) and trigger window.print().
 *
 * Steps:
 *  1. Find the element with id="bulletin-print-content"
 *  2. Deep-clone it and fix all relative img src → absolute URLs
 *  3. Open a blank window, write minimal HTML wrapper + embedded CSS
 *  4. Inject the clone and auto-trigger print on load
 */
export function printBulletin(): void {
  const contentEl = document.getElementById('bulletin-print-content');
  if (!contentEl) {
    console.warn('printBulletin: element #bulletin-print-content not found');
    return;
  }

  // Deep-clone so we don't mutate the live DOM
  const clone = contentEl.cloneNode(true) as HTMLElement;

  // Fix img src to absolute URLs (relative URLs break in a new window)
  clone.querySelectorAll('img').forEach((img) => {
    const src = (img as HTMLImageElement).getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      // Resolve relative to current origin
      const abs = src.startsWith('/')
        ? window.location.origin + src
        : window.location.origin + '/' + src;
      (img as HTMLImageElement).src = abs;
    }
  });

  const css = `
    @page { size: A4 portrait; margin: 6mm 8mm; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0; padding: 0;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      background: #ffffff;
    }
    img { max-width: 100%; display: block; }
    .city-row  { page-break-inside: avoid !important; break-inside: avoid !important; }
    .city-col   { page-break-inside: avoid !important; break-inside: avoid !important; }
    .bulletin-section { page-break-inside: avoid !important; break-inside: avoid !important; }

    /*
     * KEY FIX: the root container has minHeight:'297mm' (full A4 height),
     * but the printable area is only 297mm − 6mm top − 6mm bottom = 285mm.
     * Without this override the footer always overflows onto a blank page 2.
     */
    #bulletin-print-content {
      min-height: 285mm !important;
      box-shadow: none !important;
    }
  `;

  const win = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes,menubar=yes,toolbar=yes');
  if (!win) {
    alert('Le navigateur a bloqué l\'ouverture de la fenêtre d\'impression. Autorisez les popups pour ce site.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bulletin MALI-METEO</title>
  <style>${css}</style>
</head>
<body>
${clone.outerHTML}
<script>
  // Wait for images to load before printing
  window.addEventListener('load', function() {
    setTimeout(function() {
      window.print();
    }, 300);
  });
</script>
</body>
</html>`);

  win.document.close();
}
