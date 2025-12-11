# Public Assets Folder

This folder contains static assets that are served directly by Vite from the root path.

## Common Assets

### Favicons
Place your favicon files here. Common favicon files include:
- `favicon.ico` - Main favicon (browsers will look for this)
- `favicon-16x16.png` - 16x16 favicon
- `favicon-32x32.png` - 32x32 favicon
- `apple-touch-icon.png` - 180x180 icon for iOS devices
- `android-chrome-192x192.png` - 192x192 icon for Android
- `android-chrome-512x512.png` - 512x512 icon for Android

### Other Static Assets
- `robots.txt` - Search engine crawler instructions
- `sitemap.xml` - Site map for search engines
- `manifest.json` - Web app manifest (PWA)
- Any other static files you want to serve at the root level

## How to Reference

In your HTML files, reference these assets from the root:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

Files in this folder are copied to the `dist` folder during build and served from the root path.

