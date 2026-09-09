import * as XLSX from "xlsx";
import { parseCsv } from "./csv";

export async function parseExcel(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  try {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, raw: false });
    if (json.length === 0) {
      return { headers: [], rows: [] };
    }
    const headers = (json[0] || []).map((h) => String(h ?? "").trim());
    const rows = json.slice(1).map((row) => (row || []).map((cell) => String(cell ?? "").trim()));
    return { headers, rows };
  } catch (err) {
    console.error("parseExcel error:", err);
    throw new Error("Gagal membaca file Excel. Pastikan file berformat .xlsx dan tidak rusak.");
  }
}

export async function parseImportFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = await file.text();
    return parseCsv(text);
  }
  return parseExcel(file);
}

export function buildExcel(headers: string[], rows: string[][]): Blob {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadExcel(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
