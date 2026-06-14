# Process Toolkit

Browser-based quick **calculation & estimation tools for chemical process
engineers**. No installation, no build step, no server — open the page and use
it. Every tool lets you pick the units for each input *and* each output, flags
results against industry heuristics (API / GPSA / TEMA velocity, ratio and
temperature limits), recommends **real, standard equipment** (actual ASME pipe
sizes, API 526 orifice letters, NEMA motor ratings), accepts your **design
margins**, and cites its **references**.

## Tools

| Tool | Method | Realistic output / limit checks |
|------|--------|-------------------------------|
| Unit Conversion | 18 dimensions, offset-aware (temp & gauge pressure) | — |
| Pipe Sizing | Velocity sizing → ASME B36.10 selection | Service velocity guideline; API RP 14E erosional limit |
| Pressure Loss in a Pipe | Darcy–Weisbach + Churchill friction factor, fittings ΣK, elevation | Flow-regime flag |
| Two-Phase Line Sizing | Homogeneous ρv² method → ASME pipe selection | ρv² screening limit; API RP 14E erosional |
| Pump Sizing & Selection | Head, hydraulic/brake power, NEMA motor pick | NPSH margin; efficiency sanity |
| Orifice / Flow-meter Sizing | ISO 5167 — size bore for ΔP or rate flow from bore | β-ratio validity (0.2–0.75) |
| Control Valve Sizing | IEC 60534 liquid & gas Cv | Choked/flashing flow; 20–80 % travel band |
| PSV / Relief Valve Sizing | API 520 vapor (critical) & liquid → API 526 orifice | Standard orifice letter selection |
| Tank Blanketing / Venting | API 2000 liquid-movement + thermal estimate | In/out-breathing basis flags |
| Compressor Sizing & Selection | Adiabatic head & power with auto-staging | Per-stage ratio & discharge-temperature limits |
| Heat Exchanger Design | LMTD area, typical-U lookup, margin | Temperature-cross / F-factor flags |
| Heat Exchanger Rating | ε-NTU outlet temps & duty | Effectiveness sanity |
| Flare Stack Relief | API 521 tip Mach sizing, flame length, radiation distances | Exit-Mach criterion |
| Noise Calculations | Screening-level valve & pipe ρv² indicators | dB(A) / vibration thresholds |
| Steam Property Calculator | IAPWS-IF97 (Regions 1, 2 & 4) | Phase/region indicator |
| Vessel Wall Thickness | ASME VIII Div 1 (UG-27 / UG-32) internal pressure | Thin-wall validity; MAWP back-calc |

## Run it locally

Just open `index.html` in any modern browser — double-click it, or:

```bash
# optional: serve it (any static server works)
python3 -m http.server
# then visit http://localhost:8000
```

Nothing to install. The fonts load from Google Fonts when online and fall back
to system fonts offline.

## Deploy free on GitHub Pages

1. Push this repo to GitHub (GitHub Desktop → Add Local Repository → Publish).
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, pick `main` and `/ (root)`, save.
3. Your toolkit goes live at `https://<you>.github.io/<repo>/` in a minute or two.

The included `.nojekyll` file tells Pages to serve everything as-is. A ready-made
GitHub Actions workflow is also provided in `.github/workflows/pages.yml` if you
prefer Actions-based deployment.

## How a result is built

Each tool declares its inputs (with a dimension for unit handling) and a
`compute()` that receives everything already converted to SI base units and
returns outputs, limit-checks and references. The UI converts your input units
to SI, runs the calc, and converts each output back to whatever unit you select.

### Adding a tool (the easy part)

To grow the toolkit later you only touch the `js/tools/` folder and one block:

1. Copy any existing tool file as a starting point, e.g. `js/tools/my-tool.js`,
   and write your `PET.registerTool({ id, name, category, blurb, inputs, compute })`.
2. Add one `<script src="js/tools/my-tool.js"></script>` line in the clearly
   marked **TOOLS** block of `index.html`.

The new tool then appears in the sidebar under its `category`, and
`node tests/run.js` will load it automatically (the test harness reads the same
list of tool tags from `index.html`, so the two never drift apart).

> Note: tools load via plain `<script>` tags so the page works when opened
> directly from disk (`file://`) as well as when served. Avoid dynamic script
> injection for tools — browsers block it for local files.

```
js/
  core.js            namespace, tool registry, number formatting
  units.js           dimensional unit engine (scale + offset)
  standards.js       pipe schedules, API 526 orifices, NEMA motors, K-values, U & velocity tables
  fluids.js          Reynolds, Churchill friction factor, roughness
  steam.js           IAPWS-IF97 Regions 1/2/4
  app.js             generic form + results UI (boots on DOMContentLoaded)
  tools/*.js         one file per tool (registers via PET.registerTool)
```

## Tests

A Node harness validates the engine and every tool's `compute()` against
engineering reference values (IF97 steam points, real NPS selection, API orifice
letters, compressor staging, LMTD/ε-NTU, unit round-trips):

```bash
node tests/run.js
```

## Accuracy & scope

These are **estimation / screening tools** for early engineering. They use
widely published correlations and rules of thumb. The steam properties follow
IAPWS-IF97 and match the standard's reference points; the Flare and Noise tools
are explicitly screening-level. Always confirm against your project design basis,
licensor data and the governing codes before issuing anything.

## References

ASME B36.10M · ASME BPVC Section VIII Div 1 & Section II-D · API RP 14E ·
API 520 / 521 / 526 / 537 · API 610 / 617 / 618 · API Std 2000 ·
IEC 60534-2-1 / 60534-8-3 · ISO 5167 · NEMA MG-1 · TEMA · GPSA Engineering Data Book ·
Crane TP-410 · Perry's Chemical Engineers' Handbook · Coulson & Richardson Vol. 6 ·
Kays & London · IAPWS-IF97 (R7-97) · NIST SP 811 · Norsok P-001 / Energy Institute.

## License

MIT — see [LICENSE](LICENSE).
