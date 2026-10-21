# Certificate assets

Read at runtime by `src/lib/certificates/pdf.ts` (from `process.cwd()`, the project root).

| File | What | Source / licence |
|---|---|---|
| `logo.jpg` | Client logo (maple leaf with orbits) | Extracted unchanged from the client's sample certificate (`Certificate-Tanner-Harnden.pdf`, a ClassMarker export) |
| `LiberationSerif-{Regular,Bold,Italic}.ttf` | Liberation Serif 2.1.5 — metric-compatible with the Times New Roman of the sample, so lines keep the same widths | SIL Open Font License 1.1 (`OFL.txt`) |
| `OpenSans-Bold.ttf` | Open Sans 3.003 Bold, used for "is hereby granted to" as in the sample | [googlefonts/opensans](https://github.com/googlefonts/opensans), SIL Open Font License 1.1 (`OFL.txt`) |

The fonts are embedded (subset) in every generated certificate PDF; the OFL allows this.
