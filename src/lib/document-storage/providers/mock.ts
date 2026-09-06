import { DocumentStorageProvider } from "../types";

const inMemoryStore = new Map<string, { buffer: Buffer; mimeType: string }>();
const idempotencyStore = new Map<string, string>();

export function createMockProvider(): DocumentStorageProvider {
  return {
    async upload({ schoolId, entityType, entityId, documentType, idempotencyKey, filename, mimeType, buffer }) {
      const extension = filename.split(".").pop() || "bin";
      const safeSchoolId = schoolId.replace(/[^a-zA-Z0-9\-_]/g, "");
      const safeEntityType = entityType.replace(/[^a-zA-Z0-9\-_]/g, "");
      const safeEntityId = entityId.replace(/[^a-zA-Z0-9\-_]/g, "");
      const safeDocumentType = documentType.replace(/[^a-zA-Z0-9\-_]/g, "");

      const existingPath = idempotencyStore.get(idempotencyKey);
      if (existingPath) {
        return { storageObjectId: existingPath, storagePath: existingPath, idempotencyKey };
      }

      const objectId = `mock-${safeSchoolId}-${safeEntityType}-${safeEntityId}-${safeDocumentType}-${Date.now()}`;
      const storagePath = `${safeSchoolId}/${safeEntityType}/${safeEntityId}/${safeDocumentType}/${objectId}.${extension}`;

      inMemoryStore.set(storagePath, { buffer, mimeType });
      idempotencyStore.set(idempotencyKey, storagePath);

      return { storageObjectId: objectId, storagePath, idempotencyKey };
    },

    async download(storagePath) {
      const record = inMemoryStore.get(storagePath);
      if (!record) {
        throw new Error("Document not found in mock storage.");
      }
      return { buffer: record.buffer, mimeType: record.mimeType };
    },

    async delete(storagePath) {
      inMemoryStore.delete(storagePath);
    },

    async getMetadata(storagePath) {
      const record = inMemoryStore.get(storagePath);
      if (!record) {
        throw new Error("Document not found in mock storage.");
      }
      return { size: record.buffer.length, mimeType: record.mimeType };
    },
  };
}
