# US Tariff Lookup — Browser Extension

**Instant US HTS code & duty lookup in your browser** — MFN general rates, China Section 301 list flags, and Section 232 chapter hints, searchable by code prefix, English keyword, or Chinese product name. 100% local: the versioned duty ruleset ships inside the extension. No account, no tracking, no network calls.

> Companion tools (full landed-cost calculator, tariff radar, invoice generator): [invoicetariff.com](https://invoicetariff.com)

## Features

- **Instant HTS search** — code prefix (`8471`), product keyword (`baby strollers`), or Chinese keywords (`玩具`, `笔记本电脑`); 484 top-traded codes carry Chinese names
- **Stacked-layer alerts** — China Section 301 list & rate (e.g. `+25%, List 3`) and Section 232 chapter hints on results
- **Right-click lookup** — select any code on any page → context menu lookup
- **Address-bar mode** — type `tariff` + a code/keyword, get suggestions as you type
- **Deep links** — one hop to the [landed-cost calculator](https://invoicetariff.com/en/tariff-calculator) and the [tariff radar](https://invoicetariff.com/en/radar)
- **Versioned ruleset** — popup shows the snapshot version and as-of date

## Install

- **Firefox**: [Firefox Add-ons (AMO)](https://addons.mozilla.org/) — search "US Tariff Lookup"
- **Chrome / Edge**: Chrome Web Store & Edge Add-ons listings coming soon — meanwhile load unpacked:

```bash
# load the extension/ folder via chrome://extensions or edge://extensions → Developer mode → Load unpacked
```

## Data provenance

`extension/data/data.json` is built from the [invoicetariff.com](https://invoicetariff.com) versioned ruleset (snapshot v0.3.4, as of 2026-10-07; sourced from USITC HTS Rev. 20 and USTR Section 301 actions):

- 5,710 HTS 8-digit codes (MFN general rate text)
- 484 rich entries with Chinese names & keywords
- China Section 301 (per-code), Section 232 (chapter hints)
- 484 deep-link detail pages on invoicetariff.com

Rebuild with `tools/build-data.mjs` (run inside the main [invoice-tariff-tool](https://github.com/invoicetariff/invoicetariff) repo, which owns the authoritative `engine/data` sources).

## Privacy

No data collection, no analytics, no remote code. All searches run locally. Privacy policy: https://invoicetariff.com/privacy

Rates are indicative — always verify against the official HTS before customs entry.

## License

[MIT](LICENSE)
