# Font licenses

All font files in this directory were downloaded from Google Fonts
(`fonts.googleapis.com` / `fonts.gstatic.com`) and are self-hosted here to
avoid a network fetch at app startup. Each family below lists its license and
upstream source. Files are the `latin` subset (Latin-1 Supplement, which
covers English and Portuguese diacritics) served by Google Fonts' CSS2 API.

Google serves each of these families as one variable-weight file covering the
whole 400–700 range, so where a family lists a single physical file below,
both its regular and bold `@font-face` rules in
`src/styles/fonts/annotation-fonts.css` intentionally point at that same
file with different static `font-weight` declarations — this is not a
missing weight, it's two CSS faces sharing one physical font file.

## Bebas Neue
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Bebas+Neue
- Files: `bebas-neue-400.woff2`

## Caveat
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Caveat
- Files: `caveat-400.woff2` (covers 400 and 700)

## DM Sans
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/DM+Sans
- Files: `dm-sans-400.woff2` (covers 400 and 700), `dm-sans-400-italic.woff2` (covers 400 and 700 italic)

## Fira Code
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Fira+Code
- Files: `fira-code-400.woff2` (covers 400 and 700)

## IBM Plex Mono
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/IBM+Plex+Mono
- Files: `ibm-plex-mono-400.woff2`, `ibm-plex-mono-700.woff2`, `ibm-plex-mono-400-italic.woff2`, `ibm-plex-mono-700-italic.woff2`

## IBM Plex Sans
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/IBM+Plex+Sans
- Files: `ibm-plex-sans-400.woff2` (covers 400 and 700), `ibm-plex-sans-400-italic.woff2` (covers 400 and 700 italic)

## Inter
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Inter
- Files: `iris-sans-variable.woff2` (covers 400 and 700 — the same physical file used by the UI font stack, see "UI fonts" below), `inter-400-italic.woff2` (covers 400 and 700 italic)

## Lora
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Lora
- Files: `lora-400.woff2` (covers 400 and 700), `lora-400-italic.woff2` (covers 400 and 700 italic)

## Manrope
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Manrope
- Files: `manrope-400.woff2` (covers 400 and 700)

## Merriweather
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Merriweather
- Files: `merriweather-400.woff2` (covers 400 and 700), `merriweather-400-italic.woff2` (covers 400 and 700 italic)

## Oswald
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Oswald
- Files: `oswald-400.woff2` (covers 400 and 700)

## Permanent Marker
- License: Apache License 2.0
- Source: https://fonts.google.com/specimen/Permanent+Marker
- Files: `permanent-marker-400.woff2`

## Playfair Display
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Playfair+Display
- Files: `playfair-display-400.woff2` (covers 400 and 700), `playfair-display-400-italic.woff2` (covers 400 and 700 italic)

## Plus Jakarta Sans
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Plus+Jakarta+Sans
- Files: `plus-jakarta-sans-400.woff2` (covers 400 and 700), `plus-jakarta-sans-400-italic.woff2` (covers 400 and 700 italic)

## Space Grotesk
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Space+Grotesk
- Files: `space-grotesk-400.woff2` (covers 400 and 700)

## Sora
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Sora
- Files: `sora-400.woff2` (covers 400 and 700)

## UI fonts

The two families below are the interface typefaces (see `src/design/fonts.css`),
aliased locally to `Iris Sans` and `Iris Mono` via `@font-face` so the rest of
the codebase never references the upstream family name directly. Both are
variable-weight files (single file covers weight 400 through 700), downloaded
from Google Fonts' CSS2 API (`fonts.googleapis.com` / `fonts.gstatic.com`),
`latin` subset.

### Iris Sans (Inter Variable)
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/Inter
- Files: `iris-sans-variable.woff2`

### Iris Mono (JetBrains Mono Variable)
- License: SIL Open Font License 1.1
- Source: https://fonts.google.com/specimen/JetBrains+Mono
- Files: `iris-mono-variable.woff2`
