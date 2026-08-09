"use client";

export async function downloadSupportAttachment(attachmentId: string, fileName: string | null) {
  const url = `/api/support/attachments/${attachmentId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("download_failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName ?? "arquivo";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
