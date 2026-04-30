const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  appProperties?: Record<string, string>;
}

export interface StorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function listFiles(
  token: string,
  folder?: string
): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      fields:
        "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,appProperties)",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    if (folder) {
      params.set(
        "q",
        `appProperties has { key='folder' and value='${folder}' }`
      );
    }

    const res = await fetch(`${DRIVE_API}/files?${params}`, {
      headers: headers(token),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Failed to list files");
    }

    const data = await res.json();
    allFiles.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

export async function uploadFile(
  token: string,
  file: File,
  folder: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<DriveFile> {
  const metadata = {
    name: file.name,
    parents: ["appDataFolder"],
    appProperties: { folder },
  };

  if (file.size > 5 * 1024 * 1024) {
    return resumableUpload(token, file, metadata, onProgress);
  }

  return simpleUpload(token, file, metadata, onProgress);
}

async function simpleUpload(
  token: string,
  file: File,
  metadata: Record<string, unknown>,
  onProgress?: (loaded: number, total: number) => void
): Promise<DriveFile> {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const xhr = new XMLHttpRequest();

  const result = await new Promise<DriveFile>((resolve, reject) => {
    xhr.open(
      "POST",
      `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,appProperties`
    );
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.send(form);
  });

  return result;
}

async function resumableUpload(
  token: string,
  file: File,
  metadata: Record<string, unknown>,
  onProgress?: (loaded: number, total: number) => void
): Promise<DriveFile> {
  const initRes = await fetch(
    `${UPLOAD_API}/files?uploadType=resumable&fields=id,name,mimeType,size,createdTime,modifiedTime,appProperties`,
    {
      method: "POST",
      headers: {
        ...headers(token),
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    throw new Error("Failed to initiate resumable upload");
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("No upload URL returned");

  const CHUNK_SIZE = 5 * 1024 * 1024;
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, end);

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
        "Content-Length": String(end - offset),
      },
      body: chunk,
    });

    if (res.status === 200 || res.status === 201) {
      onProgress?.(file.size, file.size);
      return res.json();
    }

    if (res.status === 308) {
      const range = res.headers.get("Range");
      offset = range ? parseInt(range.split("-")[1], 10) + 1 : end;
      onProgress?.(offset, file.size);
    } else {
      throw new Error(`Resumable upload failed at offset ${offset}`);
    }
  }

  throw new Error("Upload completed without a final response");
}

export async function downloadFile(
  token: string,
  fileId: string
): Promise<Blob> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: headers(token),
  });

  if (!res.ok) {
    throw new Error("Failed to download file");
  }

  return res.blob();
}

export async function deleteFile(
  token: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: headers(token),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error("Failed to delete file");
  }
}

export async function getStorageQuota(token: string): Promise<StorageQuota> {
  const res = await fetch(
    `${DRIVE_API}/about?fields=storageQuota`,
    { headers: headers(token) }
  );

  if (!res.ok) throw new Error("Failed to get storage quota");

  const data = await res.json();
  const q = data.storageQuota;

  return {
    limit: Number(q.limit),
    usage: Number(q.usage),
    usageInDrive: Number(q.usageInDrive),
    usageInDriveTrash: Number(q.usageInDriveTrash),
  };
}

export async function updateFileMetadata(
  token: string,
  fileId: string,
  metadata: { name?: string; appProperties?: Record<string, string> }
): Promise<DriveFile> {
  const res = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,appProperties`,
    {
      method: "PATCH",
      headers: {
        ...headers(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!res.ok) throw new Error("Failed to update file");
  return res.json();
}
