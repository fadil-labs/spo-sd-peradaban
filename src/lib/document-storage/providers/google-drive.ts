import { DocumentStorageProvider } from "../types";

function loadGoogleDriveConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_DRIVE_CLIENT_ID, " +
        "GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN."
    );
  }

  return { clientId, clientSecret, refreshToken };
}

export function createGoogleDriveProvider(): DocumentStorageProvider {
  loadGoogleDriveConfig();

  return {
    async upload() {
      throw new Error(
        "Google Drive provider is not yet implemented. Use the mock provider for testing."
      );
    },

    async download() {
      throw new Error(
        "Google Drive provider is not yet implemented. Use the mock provider for testing."
      );
    },

    async delete() {
      throw new Error(
        "Google Drive provider is not yet implemented. Use the mock provider for testing."
      );
    },

    async getMetadata() {
      throw new Error(
        "Google Drive provider is not yet implemented. Use the mock provider for testing."
      );
    },
  };
}
