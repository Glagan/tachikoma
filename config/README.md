# Webpack configuration scripts

**tachikoma** uses 2 custom written Webpack plugins to transform the manifest for multiple browsers and rebuild in watch mode.

## Usage

The plugins needs to be built before being used in the root webpack configuration, you only need to install the dependencies:

```bash
yarn install
```

You can then build the plugins:

```bash
yarn run build
```

And you're ready to go ! You can now run ``yarn run dev`` for example at the root of the **tachikoma** folder.
