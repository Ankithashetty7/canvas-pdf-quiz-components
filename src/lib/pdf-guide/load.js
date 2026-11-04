import { loadScript } from '@/lib/quiz/engine';

const PDFJS_VERSION = '3.11.174';
const PDFJS = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Sites often allow workers only from their own origin or `blob:` URLs
// (CSP `worker-src 'self' blob:`), so the CDN worker is wrapped in a blob.
// If even that fails, pdf.js falls back to parsing on the main thread.
let workerUrl = null;
const workerBlobUrl = async () => {
  if (workerUrl) return workerUrl;
  try {
    const response = await fetch(PDFJS_WORKER);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const code = await response.text();
    workerUrl = URL.createObjectURL(
      new Blob([code], { type: 'text/javascript' }),
    );
  } catch {
    workerUrl = PDFJS_WORKER;
  }
  return workerUrl;
};

// pdf.js is large, so it is fetched only when a PDF is opened.
const loadPdfJs = async () => {
  if (!window.pdfjsLib) await loadScript(PDFJS);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = await workerBlobUrl();
  return window.pdfjsLib;
};

// Media fields hold site-relative paths ("/sites/default/files/…"). Inside
// editor previews the frame's own address may not be a real URL, so resolve
// against every base we can find.
const absoluteUrl = (url) => {
  const bases = [document.baseURI, window.location.href];
  try {
    bases.push(window.parent.location.href);
  } catch {
    // Cross-origin parent; nothing to add.
  }
  for (const base of bases) {
    try {
      return new URL(url, base).href;
    } catch {
      // Try the next base.
    }
  }
  return url;
};

export const openPdf = async (source) => {
  const pdfjs = await loadPdfJs();
  let data = source;
  if (typeof source === 'string') {
    const url = absoluteUrl(source);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Could not download the PDF (HTTP ${response.status}) from ${url}`,
      );
    }
    data = await response.arrayBuffer();
  }
  return pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
};

// Positioned text for every page, in the shape `buildGuide` expects.
export const readPages = async (doc, onProgress) => {
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      number: n,
      width: viewport.width,
      height: viewport.height,
      items: content.items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5],
          w: item.width,
          size: Math.hypot(item.transform[2], item.transform[3]),
        })),
    });
    page.cleanup();
    onProgress?.(n, doc.numPages);
  }
  return pages;
};

// Renders one page to a JPEG data URL, e.g. the cover as the hero image.
export const renderPage = async (doc, number, targetWidth = 1400) => {
  const page = await doc.getPage(number);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: targetWidth / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport })
    .promise;
  const src = canvas.toDataURL('image/jpeg', 0.82);
  page.cleanup();
  return { src, width: canvas.width, height: canvas.height };
};
