# Webpack configuration scripts

## Usage

Javascript files are compiled using any bundler which make them importable in ``webpack.config.js``, for example with rollup:

```bash
rollup ManifestTransformer.ts -p node-resolve,commonjs,typescript -o ManifestTransformer.js
rollup WebExtensionPlugin.ts -p node-resolve,commonjs,typescript -o WebExtensionPlugin.js
```
