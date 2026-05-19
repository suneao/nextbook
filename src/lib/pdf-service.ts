"use client";

let pdfjsLib: any = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (typeof window === "undefined")
    throw new Error("PDF.js only works in browser");

  pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

export async function extractTextFromPDF(base64Data: string): Promise<string> {
  const pdfjs = await getPdfJs();
  const raw = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  const loadingTask = pdfjs.getDocument({ data: atob(raw) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as any[])
      .map((item: any) => item.str || "")
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

export async function extractTextFromPDFFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const text = await extractTextFromPDF(base64);
        resolve(text);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
