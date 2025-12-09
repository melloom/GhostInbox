# Clear Vite Cache - Quick Fix

If you're experiencing module loading errors in Vite, clear the cache:

## Quick Fix

```bash
# Stop the dev server (Ctrl+C), then run:
rm -rf node_modules/.vite
rm -rf dist

# Restart dev server
npm run dev
```

## What This Does

- Removes Vite's dependency pre-bundling cache
- Clears build artifacts
- Forces Vite to rebuild dependencies fresh

## When to Use

- Module loading errors
- "Loading failed for the module" errors
- Dependency cache corruption
- After major dependency updates

## Alternative: Full Clean

If the above doesn't work:

```bash
# Remove all caches and rebuild
rm -rf node_modules/.vite
rm -rf dist
rm -rf node_modules
npm install
npm run dev
```

