// @ts-ignore
import * as pdfModule from 'pdf-parse';

export interface ExtractedPdfDocument {
  text: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
  fileName?: string;
  fileSizeBytes?: number;
}

export class PdfExtractorService {
  /**
   * Extracts clean, decoded Unicode text, page count, and metrics from a PDF buffer.
   * Uses Mozilla PDF.js engine (pdf-parse) with font CMap / Identity-H decoding,
   * with pypdf as a seamless secondary fallback.
   */
  public static async extractTextFromPdfBuffer(
    buffer: Buffer,
    fileName?: string
  ): Promise<ExtractedPdfDocument> {
    // 1. Primary: Use PDFParse (Mozilla PDF.js engine with full CMap & Font decoding)
    try {
      const PDFParseClass =
        (pdfModule as any).PDFParse ||
        (pdfModule as any).default?.PDFParse ||
        (typeof pdfModule === 'function' ? pdfModule : null);

      if (PDFParseClass) {
        let textResult = '';
        let totalPages = 1;

        if (typeof PDFParseClass === 'function' && PDFParseClass.prototype?.load) {
          const parser = new PDFParseClass({ data: buffer });
          await parser.load();
          const res = await parser.getText();
          if (res) {
            textResult = typeof res === 'string' ? res : res.text || '';
            totalPages = res.total || res.pages?.length || 1;
          }
        } else if (typeof PDFParseClass === 'function') {
          const res = await (PDFParseClass as any)(buffer);
          textResult = res?.text || '';
          totalPages = res?.numpages || 1;
        }

        // Clean up text: remove page boundary tags and normalize whitespace
        textResult = textResult
          .replace(/-- \d+ of \d+ --/g, '')
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (textResult.length > 10) {
          const words = textResult.split(/\s+/).filter(Boolean);
          return {
            text: textResult,
            pageCount: totalPages,
            wordCount: words.length,
            charCount: textResult.length,
            fileName,
            fileSizeBytes: buffer.length,
          };
        }
      }
    } catch (err: any) {
      console.warn('PDFParse primary engine failed, attempting pypdf fallback:', err?.message || err);
    }

    // 2. Secondary Fallback: Use Python pypdf (handles all complex CIDFonts / Identity-H / CMaps)
    try {
      const { spawnSync } = await import('child_process');
      const b64 = buffer.toString('base64');
      const pyScript = `import sys, io, base64, json, pypdf
try:
    data = base64.b64decode("${b64}")
    reader = pypdf.PdfReader(io.BytesIO(data))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    full = "\\n\\n".join(pages_text).strip()
    print(json.dumps({"text": full, "pageCount": len(reader.pages)}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
      const res = spawnSync('python', ['-c', pyScript], {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      });

      if (res.stdout) {
        const parsed = JSON.parse(res.stdout.trim());
        if (parsed.text && parsed.text.length > 10) {
          const words = parsed.text.split(/\s+/).filter(Boolean);
          return {
            text: parsed.text,
            pageCount: parsed.pageCount || 1,
            wordCount: words.length,
            charCount: parsed.text.length,
            fileName,
            fileSizeBytes: buffer.length,
          };
        }
      }
    } catch (pyErr) {
      console.warn('pypdf fallback failed:', pyErr);
    }

    // 3. If all engines yield no text, check if PDF is scanned
    let pageCount = 1;
    const strContent = buffer.toString('latin1');
    const pageMatch = strContent.match(/\/Count\s+(\d+)/);
    if (pageMatch && parseInt(pageMatch[1], 10) > 0) {
      pageCount = parseInt(pageMatch[1], 10);
    }

    return {
      text: 'No readable digital text found in this PDF. The document may consist of scanned images or raster graphics without an embedded text layer.',
      pageCount,
      wordCount: 0,
      charCount: 0,
      fileName,
      fileSizeBytes: buffer.length,
    };
  }
}
