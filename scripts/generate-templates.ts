import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const templatesDir = path.join(process.cwd(), "public", "templates");

if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

const studentsHeaders = ["NIS", "Nama Lengkap", "Tanggal Lahir", "Alamat", "Status"];
const studentsRows = [
  ["001", "Ahmad Hidayat", "2010-05-15", "Jl. Melati No. 1", "active"],
  ["002", "Budi Prasetyo", "2010-03-22", "Jl. Anggrek No. 2", "active"],
];
const studentsSheet = XLSX.utils.aoa_to_sheet([studentsHeaders, ...studentsRows]);
const studentsWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(studentsWorkbook, studentsSheet, "Siswa");
fs.writeFileSync(path.join(templatesDir, "students-template.xlsx"), XLSX.write(studentsWorkbook, { bookType: "xlsx", type: "buffer" }));

const classesHeaders = ["Nama Kelas", "Tahun Ajaran", "Tingkatan"];
const classesRows = [
  ["1A", "2025/2026", "1"],
  ["1B", "2025/2026", "1"],
  ["2A", "2025/2026", "2"],
];
const classesSheet = XLSX.utils.aoa_to_sheet([classesHeaders, ...classesRows]);
const classesWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(classesWorkbook, classesSheet, "Kelas");
fs.writeFileSync(path.join(templatesDir, "classes-template.xlsx"), XLSX.write(classesWorkbook, { bookType: "xlsx", type: "buffer" }));

const guardiansHeaders = ["Nama Wali", "Email", "No HP", "Hubungan", "NIS Siswa", "Nama Siswa"];
const guardiansRows = [
  ["Andi Hidayat", "andi.hidayat@example.com", "081234567890", "ayah", "001", "Ahmad Hidayat"],
  ["Budi Prasetyo", "budi.prasetyo@example.com", "081345678901", "ayah", "002", "Budi Prasetyo"],
];
const guardiansSheet = XLSX.utils.aoa_to_sheet([guardiansHeaders, ...guardiansRows]);
const guardiansWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(guardiansWorkbook, guardiansSheet, "Wali");
fs.writeFileSync(path.join(templatesDir, "guardians-template.xlsx"), XLSX.write(guardiansWorkbook, { bookType: "xlsx", type: "buffer" }));

console.log("Template Excel files generated successfully.");
