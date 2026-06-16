export function getGoogleDriveImageUrl(fileIdOrUrl: string) {
  return getGoogleDriveImageCandidates(fileIdOrUrl)[0] || fileIdOrUrl;
}

export function getGoogleDriveImageCandidates(fileIdOrUrl: string) {
  const trimmed = fileIdOrUrl.trim();
  const id = extractGoogleDriveFileId(fileIdOrUrl);

  if (!id) {
    return trimmed ? [trimmed] : [];
  }

  return Array.from(
    new Set([
      `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${id}=w1600`,
      `https://drive.google.com/uc?export=view&id=${id}`,
      trimmed,
    ].filter(Boolean)),
  );
}

export function getGoogleDrivePreviewUrl(fileIdOrUrl: string) {
  const id = extractGoogleDriveFileId(fileIdOrUrl);
  return id ? `https://drive.google.com/file/d/${id}/preview` : fileIdOrUrl;
}

export function getGoogleDriveFileUrl(fileIdOrUrl: string) {
  const id = extractGoogleDriveFileId(fileIdOrUrl);
  return id ? `https://drive.google.com/file/d/${id}/view` : fileIdOrUrl;
}

export function getGoogleDriveDownloadUrl(fileIdOrUrl: string) {
  const id = extractGoogleDriveFileId(fileIdOrUrl);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : fileIdOrUrl;
}

export function extractGoogleDriveFileId(value: string) {
  const trimmed = value.trim();
  const filePathMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  return filePathMatch?.[1] || queryMatch?.[1] || (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) ? trimmed : '');
}
