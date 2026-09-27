export function courseThumbnailUrl(seed: string, width = 640, height = 400) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}
