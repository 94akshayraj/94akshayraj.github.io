# Research Library for APA 7

A client-side, GitHub Pages compatible research reference manager focused on APA 7th edition citations, local PDF reading, highlights, notes, tags, and persistent IndexedDB-backed storage.

## Features
- Create and organize academic references by type
- Generate APA 7 reference list and in-text citations
- Store all data in IndexedDB so it survives reloads and browser restarts
- Upload and view PDFs in-browser with page navigation and zoom
- Add persistent highlights and notes to selected PDF text
- Track reading progress and reading status
- Search, filter, and tag references
- Export and import the full library as a ZIP backup
- Works as a static site for GitHub Pages

## Tech stack
- React
- TypeScript
- Vite
- Dexie / IndexedDB
- PDF.js
- JSZip

## Local development

1. Install dependencies
   ```bash
   npm install
   ```
2. Run the app locally
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
3. Open the local Vite URL in the browser.

## Production build

```bash
npm run build
```

The compiled production files are available in the `dist/` folder.

## Deploy to GitHub Pages

This project is configured for static deployment on GitHub Pages.

Recommended setup:
- Use the included GitHub Actions workflow in `.github/workflows/deploy-pages.yml`
- Push to the `main` branch
- Enable GitHub Pages in repository settings with the `GitHub Actions` source

If you are deploying to a custom repository or sub-path, update the `base` value in `vite.config.ts` and the `homepage` field in `package.json` accordingly.

## Storage model

The app stores data in IndexedDB rather than localStorage.

Tables include:
- `references`
- `pdfs`
- `highlights`
- `notes`
- `bookmarks`
- `tags`
- `settings`

This ensures the library persists locally without a backend.

## Import / export

Use the Settings screen to:
- Export the library as a ZIP backup
- Import a previously exported backup

The export includes the current database contents and any associated PDF blobs. The ZIP contains a `library.json` file and a `pdfs/` folder for stored documents.

## Limitations

- External metadata lookup is not required and is intentionally optional.
- Browser storage has capacity limits; large PDF collections may eventually require file management discipline.
- Because this is a static app, network-dependent features require internet access.

## Testing

```bash
npm test
```

This includes the APA citation engine checks and a few library persistence assertions.
