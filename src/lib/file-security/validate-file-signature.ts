export type SupportedFileType = {
  mime: string;
  extension: string;
  signatures: number[][];
  maxSize: number;
};

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = [
  {
    mime: "image/jpeg",
    extension: "jpg",
    signatures: [
      [0xff, 0xd8, 0xff],
    ],
    maxSize: 5 * 1024 * 1024,
  },
  {
    mime: "image/png",
    extension: "png",
    signatures: [
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ],
    maxSize: 5 * 1024 * 1024,
  },
  {
    mime: "image/webp",
    extension: "webp",
    signatures: [
      [0x52, 0x49, 0x46, 0x46],
    ],
    maxSize: 5 * 1024 * 1024,
  },
  {
    mime: "application/pdf",
    extension: "pdf",
    signatures: [
      [0x25, 0x50, 0x44, 0x46],
    ],
    maxSize: 5 * 1024 * 1024,
  },
];

export function getSupportedFileType(mime: string): SupportedFileType | undefined {
  return SUPPORTED_FILE_TYPES.find((type) => type.mime === mime);
}

export async function validateFileSignature(file: File): Promise<{ valid: boolean; mime?: string; extension?: string; error?: string }> {
  const allowedTypes = SUPPORTED_FILE_TYPES.map((type) => type.mime);
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF." };
  }

  const supportedType = getSupportedFileType(file.type);
  if (!supportedType) {
    return { valid: false, error: "Format file tidak didukung." };
  }

  if (file.size > supportedType.maxSize) {
    return { valid: false, error: `Ukuran file terlalu besar. Maksimal ${supportedType.maxSize / (1024 * 1024)} MB.` };
  }

  const header = new Uint8Array(12);
  try {
    const blob = file.slice(0, 12);
    const buffer = await blob.arrayBuffer();
    header.set(new Uint8Array(buffer));
  } catch {
    return { valid: false, error: "Gagal membaca file." };
  }

  const isSignatureMatch = supportedType.signatures.some((signature) => {
    if (header.length < signature.length) return false;
    return signature.every((byte, index) => header[index] === byte);
  });

  if (!isSignatureMatch) {
    return { valid: false, error: "Konten file tidak sesuai dengan format yang diharapkan." };
  }

  if (file.type === "image/webp") {
    const webpHeader = new Uint8Array(12);
    try {
      const blob = file.slice(0, 12);
      const buffer = await blob.arrayBuffer();
      webpHeader.set(new Uint8Array(buffer));
    } catch {
      return { valid: false, error: "Gagal membaca file WEBP." };
    }

    const isRiff = webpHeader[0] === 0x52 && webpHeader[1] === 0x49 && webpHeader[2] === 0x46 && webpHeader[3] === 0x46;
    const webpBytesAt8 = webpHeader[8] === 0x57 && webpHeader[9] === 0x45 && webpHeader[10] === 0x42 && webpHeader[11] === 0x50;

    if (!isRiff || !webpBytesAt8) {
      return { valid: false, error: "File bukan WEBP yang valid." };
    }
  }

  return {
    valid: true,
    mime: file.type,
    extension: supportedType.extension,
  };
}
