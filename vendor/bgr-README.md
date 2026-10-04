# On-device background removal

`bgworker.mjs` is a bundled build of `@imgly/background-removal` 1.4.5 (AGPL-3.0, see `bgr-LICENSE.md`,
source: https://github.com/imgly/background-removal-js) wrapped in a Web Worker, built with esbuild.
`bgr-data/` holds the "medium" ISNet model and the onnxruntime-web wasm files from
`@imgly/background-removal-data` 1.4.5, so the app does not depend on a third-party CDN.
Photos never leave the device for this step.
