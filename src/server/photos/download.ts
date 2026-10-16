import { browserUserAgent, readLimited } from "../recipe-import/page";
import { detectPhotoType, maxPhotoBytes, savePhoto } from "./photo";

// Copies an image from the web into the household's photos, as if a member had uploaded it, so a
// recipe doesn't depend on another site keeping it. Returns the photo's ID, or why it couldn't.
export async function downloadPhoto(
  bucket: R2Bucket,
  owner: { householdId: string; uploadedBy: string },
  imageUrl: string,
): Promise<{ photoId: string } | { error: string }> {
  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": browserUserAgent, Accept: "image/webp,image/jpeg,image/png" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { error: `The image's site answered ${response.status}.` };
    // One byte over the limit tells a photo that is too large from one that just fits.
    const bytes = await readLimited(response, maxPhotoBytes + 1);
    if (bytes.byteLength > maxPhotoBytes) return { error: "The image is larger than 5 MB." };
    const type = detectPhotoType(bytes);
    if (!type) return { error: "That link isn't a JPEG, PNG, or WebP image." };
    return { photoId: await savePhoto(bucket, owner, bytes, type) };
  } catch {
    return { error: "Could not download the image." };
  }
}
