export type FileTextResult = {
  text: string;
  source: 'pdf' | 'text' | 'csv';
  pages?: number;
};

let pdfModulePromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfModulePromise) return pdfModulePromise;
  pdfModulePromise = (async () => {
    const [mod, workerUrlMod] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    mod.GlobalWorkerOptions.workerSrc = workerUrlMod.default;
    return mod;
  })();
  return pdfModulePromise;
}

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

const Y_TOLERANCE = 4;

/** Agrupa itens do PDF por linha (Y) e ordena da esquerda para a direita (X). */
function buildPageText(items: PdfTextItem[]): string {
  if (items.length === 0) return '';

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfTextItem[][] = [];

  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= Y_TOLERANCE);
    if (row) row.push(item);
    else rows.push([item]);
  }

  return rows
    .map((row) => {
      row.sort((a, b) => a.x - b.x);
      return row.map((it) => it.str).join(' ');
    })
    .join('\n');
}

/**
 * Extrai texto bruto de um File (PDF, TXT, CSV) para que possa ser
 * encaminhado ao parser de pontos. O bundle do pdf.js só é carregado
 * quando o utilizador realmente envia um PDF.
 */
export async function extractTextFromFile(file: File): Promise<FileTextResult> {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isCsv = file.type === 'text/csv' || name.endsWith('.csv');

  if (isPdf) {
    const pdfjsLib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!('str' in raw) || typeof raw.str !== 'string' || !raw.str.trim()) continue;
        const tr = raw.transform;
        if (!tr || tr.length < 6) continue;
        items.push({
          str: raw.str.trim(),
          x: tr[4],
          y: tr[5],
        });
      }
      parts.push(buildPageText(items));
    }
    return { text: parts.join('\n\n'), source: 'pdf', pages: pdf.numPages };
  }

  const text = await file.text();
  return { text, source: isCsv ? 'csv' : 'text' };
}

export const ACCEPTED_FILE_TYPES = '.pdf,.txt,.csv,text/plain,text/csv,application/pdf';
