export const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/mp4,audio/ogg,audio/webm,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type PendingMedia = {
  caption: string;
  file: File;
  id: string;
  previewUrl: string | null;
};

export type PreparedMediaPayload = {
  attachment: {
    byteSize: number;
    fileName: string;
    id: string;
    mediaType: "audio" | "document" | "image" | "video";
    mimeType: string;
  };
  begin: { attemptId: string; messageId: string };
  upload: { bucket: string; path: string; token: string };
};
