/**
 * Browser-safe stub for h264-mp4-encoder.
 *
 * The real package is a Node.js native addon used only by Mol*'s MP4-export
 * extension. It requires `fs`, `path`, and `crypto` built-ins that don't
 * exist in browsers. This stub is substituted at bundle time via
 * fileReplacements so esbuild never emits a bare `import "h264-mp4-encoder"`
 * that would cause a module-resolution failure and prevent Angular from
 * bootstrapping.
 */
export default function createH264Encoder() {
  throw new Error("MP4 export is not supported in the browser.");
}
