export type ModelQuality = "original" | "light";

/** Resolution can be reduced without removing any named anatomical structure. */
export function defaultModelQuality(): ModelQuality {
  return "original";
}

export const modelManifest = (quality: ModelQuality) =>
  quality === "original" ? "/models/atlas.json" : "/models/atlas-mobile.json";

/** Ignore zero-sized / duplicate observer notifications; never resize CSS from WebGL. */
export function stableViewport(
  width: number,
  height: number,
  previous: { width: number; height: number },
) {
  width = Math.round(width);
  height = Math.round(height);
  return Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    (width !== previous.width || height !== previous.height)
    ? { width, height }
    : null;
}
