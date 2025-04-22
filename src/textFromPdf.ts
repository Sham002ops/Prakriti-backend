// parsePDF.ts
import fs from 'fs';
import pdf from 'pdf-parse';

export async function extractTextFromPDF(filePath: string) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdf(dataBuffer);
  return pdfData.text;
}
