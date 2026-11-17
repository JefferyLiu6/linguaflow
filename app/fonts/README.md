# Bundled application fonts

The application uses the same Playfair Display, DM Sans and JetBrains Mono families as before, through `next/font/local`. Keeping the files in the repository removes network downloads and Google CSS parsing from production builds. The CSS variable names, requested weights and styles are preserved.

| Family | Upstream font version | Files |
|---|---|---|
| Playfair Display | 1.203 | Normal and italic, variable weight |
| DM Sans | 4.004 | Normal, variable weight; optical size fixed at 14 |
| JetBrains Mono | 2.211 | Normal and italic, variable weight |

These versions match the Google Fonts responses inspected during the build fix. DM Sans is instantiated at optical size 14 to match the previous CSS request; default-weight ASCII advance widths match that served font exactly. The complete upstream glyph sets are retained, rather than dropping non-Latin coverage. WOFF2 conversion changes packaging, not the typeface design.

`sources.json` records official Google Fonts repository URLs, Git blob identifiers and SHA-256 hashes. Each family includes its upstream SIL Open Font License in a separate `*-OFL.txt` file. Font binaries total approximately 402 KiB.

The triggering Next.js 16.2 loader expects a file extension at the end of each Google font URL. Current DM Sans responses can instead contain a `fonts.gstatic.com/l/font?...` URL, causing the loader to dereference a failed extension match. Local font loading avoids that dependency without upgrading Next.js.
