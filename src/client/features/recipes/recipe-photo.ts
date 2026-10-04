import { recipePhotoChanged } from "@shared/recipes";

// What the photo picker accepts. Uploads are re-encoded smaller whatever was picked.
export const photoInputTypes = ["image/jpeg", "image/png", "image/webp"];

// How saving changes a recipe's photo: null keeps it, "removed" clears it, a file replaces it.
export type PhotoEdit = { file: File; previewUrl: string } | "removed" | null;

// Large enough for the recipe page on a sharp screen, small enough to upload on a phone.
const maxEdge = 1600;

// Fits a photo within maxEdge and re-encodes it, as WebP where the browser can encode it.
async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  // Browsers without a WebP encoder return a PNG instead, which would be far larger.
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Could not read that photo. Try another one.");
  return jpeg;
}

async function uploadPhoto(file: File): Promise<string> {
  const body = await shrinkPhoto(file);
  let response: Response;
  try {
    response = await fetch("/api/photos", {
      method: "POST",
      body,
      headers: { "Content-Type": body.type },
    });
  } catch {
    throw new Error("Could not upload the photo. Check your connection and try again.");
  }
  const result: unknown = await response.json().catch(() => null);
  if (typeof result === "object" && result !== null) {
    if (response.ok && "photoId" in result && typeof result.photoId === "string") {
      return result.photoId;
    }
    if ("error" in result && typeof result.error === "string") throw new Error(result.error);
  }
  throw new Error("Could not upload the photo. Please try again.");
}

// Uploads a newly chosen photo and returns the event that puts it on the recipe, if any.
export async function photoEditEvents(
  edit: PhotoEdit,
  { id, updatedBy, updatedAt }: { id: string; updatedBy: string; updatedAt: Date },
) {
  if (edit === null) return [];
  const photoId = edit === "removed" ? undefined : await uploadPhoto(edit.file);
  return [recipePhotoChanged({ id, ...(photoId && { photoId }), updatedBy, updatedAt })];
}
