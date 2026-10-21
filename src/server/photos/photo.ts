import { recipePhotoUrl } from "@shared/recipes";

// Clients shrink photos before uploading, so this is generous.
export const maxPhotoBytes = 5 * 1024 * 1024;

const signatures = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
] as const;

// The type a photo's bytes show, whatever the request claims, or null if it is not one we store.
export function detectPhotoType(bytes: Uint8Array) {
  for (const { type, bytes: signature } of signatures) {
    if (signature.every((byte, index) => bytes[index] === byte)) return type;
  }
  // RIFF....WEBP
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

const photoUrlPrefix = recipePhotoUrl("");
const photoIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function isPhotoId(value: string) {
  return photoIdPattern.test(value);
}

// Each household's photos live under its own prefix, so a member can only reach their own.
export function photoKey(householdId: string, photoId: string) {
  return `households/${householdId}/photos/${photoId}`;
}

export type PhotoType = NonNullable<ReturnType<typeof detectPhotoType>>;

// Stores a photo for the household and returns the ID recipes refer to it by.
export async function savePhoto(
  bucket: R2Bucket,
  { householdId, uploadedBy }: { householdId: string; uploadedBy: string },
  bytes: Uint8Array,
  type: PhotoType,
) {
  const photoId = crypto.randomUUID();
  await bucket.put(photoKey(householdId, photoId), bytes, {
    httpMetadata: { contentType: type },
    customMetadata: { uploadedBy },
  });
  return photoId;
}

// Removes photos nothing refers to anymore. Never throws: a photo left behind only takes space.
export async function deletePhotos(bucket: R2Bucket, householdId: string, photoIds: string[]) {
  try {
    await bucket.delete(photoIds.map((photoId) => photoKey(householdId, photoId)));
  } catch (error) {
    console.error("Deleting photos failed", error);
  }
}

// The uploaded photo a recipe's image URL refers to, or null for an image elsewhere, or none.
export function uploadedPhotoId(imageUrl: string | null) {
  const photoId = imageUrl?.startsWith(photoUrlPrefix) && imageUrl.slice(photoUrlPrefix.length);
  return photoId && isPhotoId(photoId) ? photoId : null;
}

// Removes a recipe's uploaded photo, given the recipe's image URL. An image elsewhere, or none,
// is left alone.
export async function deleteRecipePhoto(
  bucket: R2Bucket,
  householdId: string,
  imageUrl: string | null,
) {
  const photoId = uploadedPhotoId(imageUrl);
  if (photoId) await deletePhotos(bucket, householdId, [photoId]);
}

// Copies another household's photo into this one's, for a shared recipe saved here. Returns the
// copy's ID, or null if the photo is gone.
export async function copyPhoto(
  bucket: R2Bucket,
  from: { householdId: string; photoId: string },
  to: { householdId: string; uploadedBy: string },
) {
  const object = await bucket.get(photoKey(from.householdId, from.photoId));
  if (!object) return null;
  const photoId = crypto.randomUUID();
  await bucket.put(photoKey(to.householdId, photoId), object.body, {
    ...(object.httpMetadata ? { httpMetadata: object.httpMetadata } : {}),
    customMetadata: { uploadedBy: to.uploadedBy },
  });
  return photoId;
}
