# Changelog

## [1.1.0] — 2026-06-30

### Added
- **Global math extraction** — math delimiters (`$...$`, `$$...$$`, `$$$...$$$`, `\(...\)`) are now processed on the full HTML before translation, fixing formulas that span multiple text nodes
- **Smart `a` preservation** — array variable `a` is preserved only when it appears before punctuation (`,`, `)`, `=`) or operators (`+`, `-`, etc.), while article `a` is left for translation
- **Icon redesign** — Blue-to-purple gradient icons in 16/48/128 sizes

### Fixed
- Variable `i`, `j`, `k`, `n`, `m`, `x`, `y`, `z`, ... no longer translated as English words (e.g. `i` → "tôi")
- `$...$` formulas no longer corrupted when spanning element boundaries
- `$$$` triple-dollar notation preserved as a single block
- Multi-line math formulas (`$$..$$` with newlines) handled correctly
- Spacing around formulas preserved through translation

## [1.0.0] — 2026-06-29

### Initial release
- Translate Codeforces problem statements with smart DOM traversal
- Preserve math (`.tex-math`) and code (`<code>`, `<pre>`) elements
- Three view modes: Original / Translated / Dual
- Language selection via popup
- Google Translate API with MyMemory fallback
- Batch translation (5 concurrent requests)
