# PDF Translator Reader

Open a PDF, select any text, and get an instant translation with text-to-speech — right in the browser, no setup required.

## Features

- **PDF viewer** with page navigation, zoom, and a selectable text layer (PDF.js)
- **Inline translation popup** that appears near your selection — draggable, with a copy button
- **Sidebar panel** for a persistent view of the selected text and translation
- **14 languages** supported (English, Arabic, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Turkish, Korean, Hindi, Dutch)
- **Swap languages** with one click
- **Text-to-speech** for both the original and translated text (Web Speech API)
- **Translation caching** — repeated selections return instantly
- **PDF persistence** — your last-opened file is saved in IndexedDB and restored on reload

## Getting started

```bash
npm install
ng serve
```

Open `http://localhost:4200` and drop in a PDF. That's it — no API keys, no local servers.

Translation is powered by the [MyMemory API](https://mymemory.translated.net/), which is free for anonymous use (roughly 5,000 characters/day per IP). If you hit the daily limit, the service file has a commented-out [Lingva Translate](https://github.com/thedaviddelta/lingva-translate) fallback you can swap in.

## How to use

1. Upload a PDF (or it reloads the last one automatically)
2. Select text on the page — a popup appears next to your selection
3. Choose source and target languages, then hit **Translate**
4. Click the speaker icon to hear either the original or the translation
5. Copy the translation with the copy button in the popup
6. The sidebar on the right keeps a persistent view of the same info

## Project structure

```
src/app/
├── components/
│   ├── pdf-viewer/          # Canvas rendering, text layer, file upload, page/zoom controls
│   ├── sidebar/             # Persistent panel — selection, translation, TTS, language pickers
│   └── translation-popup/   # Floating popup near selection — draggable, copy, speak
├── services/
│   ├── pdf.service.ts           # PDF.js wrapper — load, render, navigate
│   ├── pdf-storage.service.ts   # IndexedDB persistence for last-opened PDF
│   ├── selection.service.ts     # Selected text state and popup visibility
│   ├── translation.service.ts   # MyMemory API client with caching and language swap
│   └── text-to-speech.service.ts # Web Speech API wrapper
├── app.ts
├── app.html
└── app.css
```

## Tech stack

| Piece           | Choice                                              |
| --------------- | --------------------------------------------------- |
| Framework       | Angular 21 (standalone components, signals, OnPush) |
| PDF rendering   | pdfjs-dist 5                                        |
| Translation     | MyMemory API (free, no key)                         |
| Text-to-speech  | Web Speech API                                      |
| PDF persistence | IndexedDB                                           |
| Styling         | Tailwind CSS 4, hand-written CSS                    |
| Build           | Angular CLI                                         |


## Author
Ahmed Mohamed |
Full-Stack Developer & Software Engineer
