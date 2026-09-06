import { DocumentStorageProvider, DocumentMetadata, UploadDocumentInput } from "./types";
import { validateFileSignature } from "@/lib/file-security/validate-file-signature";

export class DocumentStorageService {
  constructor(private provider: DocumentStorageProvider) {}

  generateStoragePath(schoolId: string, entityType: string, entityId: string, documentType: string, extension: string): string {
    const safeSchoolId = schoolId.replace(/[^a-zA-Z0-9\-_]/g, "");
    const safeEntityType = entityType.replace(/[^a-zA-Z0-9\-_]/g, "");
    const safeEntityId = entityId.replace(/[^a-zA-Z0-9\-_]/g, "");
    const safeDocumentType = documentType.replace(/[^a-zA-Z0-9\-_]/g, "");
    const uniqueId = crypto.randomUUID();
    return `${safeSchoolId}/${safeEntityType}/${safeEntityId}/${safeDocumentType}/${uniqueId}.${extension}`;
  }

  generateIdempotencyKey(schoolId: string, entityType: string, entityId: string, documentType: string): string {
    const normalized = `${schoolId}|${entityType}|${entityId}|${documentType}`;
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `idempotent-${Math.abs(hash).toString(16).padStart(16, "0")}`;
  }

  async upload(input: UploadDocumentInput): Promise<{ metadata: DocumentMetadata; storagePath: string }> {
    if (!input.schoolId || !input.entityType || !input.entityId || !input.documentType || !input.createdBy) {
      throw new Error("Parameter dokumen tidak valid.");
    }

    const signatureResult = await validateFileSignature(input.file);
    if (!signatureResult.valid || !signatureResult.extension) {
      throw new Error(signatureResult.error || "Format file tidak didukung.");
    }

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const storagePath = this.generateStoragePath(
      input.schoolId,
      input.entityType,
      input.entityId,
      input.documentType,
      signatureResult.extension
    );

    const idempotencyKey = this.generateIdempotencyKey(
      input.schoolId,
      input.entityType,
      input.entityId,
      input.documentType
    );

    const result = await this.provider.upload({
      schoolId: input.schoolId,
      entityType: input.entityType,
      entityId: input.entityId,
      documentType: input.documentType,
      idempotencyKey,
      filename: input.file.name,
      mimeType: input.file.type,
      buffer,
    });

    const canonicalStoragePath = result.storagePath || storagePath;

    const now = new Date().toISOString();
    const metadata: DocumentMetadata = {
      id: crypto.randomUUID(),
      schoolId: input.schoolId,
      entityType: input.entityType,
      entityId: input.entityId,
      documentType: input.documentType,
      storageProvider: this.getProviderName(),
      storageObjectId: result.storageObjectId,
      storagePath: canonicalStoragePath,
      originalFilename: input.file.name,
      mimeType: signatureResult.mime || input.file.type,
      fileSize: input.file.size,
      status: "uploaded",
      idempotencyKey: result.idempotencyKey || idempotencyKey,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    return { metadata, storagePath: canonicalStoragePath };
  }

  async download(storagePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
    return this.provider.download(storagePath);
  }

  /**
   * Deletes a document from the storage provider.
   *
   * CONTRACT: This method does NOT perform authorization.
   * The caller MUST ensure:
   *   - User is authenticated
   *   - User has the required role (admin, bendahara, or orang_tua as appropriate)
   *   - User is authorized for the school
   *   - User has ownership or legitimate access to the document
   *   - Business rules allow deletion (e.g., approved payment proofs may not be deletable)
   *
   * This service method should only be invoked from server actions or route handlers
   * that have already completed the full authorization chain.
   */
  async delete(storagePath: string): Promise<void> {
    return this.provider.delete(storagePath);
  }

  async getMetadata(storagePath: string): Promise<{ size: number | null; mimeType: string }> {
    return this.provider.getMetadata(storagePath);
  }

  private getProviderName(): string {
    return "mock";
  }
}
