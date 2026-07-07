import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PDFParse } from "pdf-parse";

const ALLOWED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }
  return null;
}

async function saveTempFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "tmp";
  const tempPath = join(tmpdir(), `reels-analyzer-${randomUUID()}.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const fs = await import("node:fs/promises");
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = readFileSync(filePath);
  const pdf = new PDFParse(dataBuffer);
  const result = await pdf.getText();
  return result.text;
}

function extractTextFromTextFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

export async function extractFileContent(file: File): Promise<string> {
  const tempPath = await saveTempFile(file);
  try {
    let text: string;
    if (file.type === "application/pdf") {
      text = await extractTextFromPdf(tempPath);
    } else {
      text = extractTextFromTextFile(tempPath);
    }
    return text.trim();
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
}
