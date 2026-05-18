/**
 * Converts an image URL to a Base64 data URL.
 * Works for both absolute and relative URLs (if served from the same origin).
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  if (!url) return "";
  
  // If it's already a data URL, return as is
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to convert image to Base64:", url, err);
    return url; // Fallback to original URL
  }
}
