# vite-plugin-svg-sprite

A Vite plugin to generate and manage SVG icon sprites. It scans a directory for SVG files, compiles them into a single sprite, and watches for changes to regenerate the sprite automatically.

## Installation

To install the plugin, run one of the following command:

```bash
npm install vite-plugin-svg-sprite --save-dev
```

```bash
pnpm add vite-plugin-svg-sprite --save-dev
```

```bash
yarn add vite-plugin-svg-sprite --save-dev
```

## Usage

In your vite.config.js (or vite.config.ts), add the plugin like this:

```js
import { defineConfig } from 'vite';
import IconSpritePlugin from 'vite-plugin-svg-sprite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    IconSpritePlugin('src/icons', 'dist')  // Specify your icons directory and output directory
  ]
});
```
1. The plugin watches the specified folder for changes to `.svg` files. It automatically rebuilds the sprite whenever any SVG files in the source directory are modified.
2. It generates a single SVG sprite file, `icon-sprite.svg`, in the specified output directory. This sprite contains all icons as `<symbol>` elements, with each icon's ID derived from its folder structure and filename (`#subfolder(optional)_filename`).
3. In components, you can reference icons from the sprite using the `<use>` tag:

```tsx
import Icons from "./assets/icon-sprite.svg"


<svg width="18" height="18">
  <use href={`${Icons}#footer_phone`}></use>
</svg>
```

## Options

- `iconsDir`: The directory containing your SVG icons. (e.g. `'src/icons'`)
- `outDir`: The output directory where the `icon-sprite.svg` will be generated. (e.g. `'dist'`)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Vasyl Vovk ([GitHub](https://github.com/Kristalkill))


