export type DocumentEntityType = "payment_proof" | "receipt" | "student_document" | "school_document";

export type DocumentStatus = "pending" | "uploaded" | "failed";

export interface DocumentMetadata {
  id: string;
  schoolId: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType: string;
  storageProvider: string;
  storageObjectId: string | null;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number | null;
  status: DocumentStatus;
  idempotencyKey: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentInput {
  schoolId: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType: string;
  file: File;
  createdBy: string;
}

export interface DocumentStorageProvider {
  upload(input: {
    schoolId: string;
    entityType: string;
    entityId: string;
    documentType: string;
    idempotencyKey: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ storageObjectId: string | null; storagePath: string; idempotencyKey: string }>;

  download(storagePath: string): Promise<{ buffer: Buffer; mimeType: string }>;

  delete(storagePath: string): Promise<void>;

  getMetadata(storagePath: string): Promise<{ size: number | null; mimeType: string }>;
}
