import { promisify } from "util";
import libre from "libreoffice-convert";

const libreConvert = promisify(libre.convert);

export async function convertPptToPdf(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  try {
    const pdfBuffer = await libreConvert(inputBuffer, ".pdf", undefined);
    return pdfBuffer;
  } catch (error) {
    console.error("Error converting PPT to PDF:", error);
    throw new Error("Failed to convert PowerPoint file to PDF");
  }
}
