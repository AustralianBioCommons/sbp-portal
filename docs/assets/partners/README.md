# Partner logos

Referenced directly by the `.partners` block in `docs/index.html`.

| File             | Institution                 | Provenance                                          |
| ---------------- | --------------------------- | --------------------------------------------------- |
| `biocommons.png` | Australian BioCommons       | converted from the horizontal CMYK PDF (see caveat) |
| `usyd.png`       | The University of Sydney    | mono-reversed source recoloured white → black       |
| `unsw.png`       | UNSW Sydney                 | official transparent PNG, used as supplied          |
| `unimelb.png`    | The University of Melbourne | checkerboard flattened to white (see caveat)        |

## Requirements

The strip renders on a **white** surface in both light and dark themes, so
supply **dark-on-transparent** artwork. A white ("reversed") logo will be
invisible — that is what happened with the University of Sydney file.

Logos render at a uniform `4.5rem` height, capped at `10rem` wide so wide
wordmarks do not dwarf the near-square crests. Differing source dimensions are
fine, but keep resolution at ≥ 2× the rendered size so they stay sharp on
retina displays.

## Known asset caveats

Two of these were repaired rather than sourced clean. Replacing them with
official assets would be better:

- **`biocommons.png`** came from a **CMYK** print PDF. CMYK does not map cleanly
  to screen RGB, so the hexagon colours are muted against the true brand values
  (`#DB9A45` vs `#F49F1E`, `#C8326F` vs `#ED087D`, `#74B8A5` vs `#5AC3B1`).
  An RGB source file would be accurate.
- **`unimelb.png`** was supplied as a WebP with the transparency checkerboard
  baked in as real pixels. The neutral checker pixels were flattened to white,
  which looks correct on the white strip but is not true transparency. An
  official transparent PNG or SVG would be cleaner.

## Adding a partner

Copy an existing `<img>` in the `.partners` block of `docs/index.html` and set
`src`, `alt`, and the intrinsic `width`/`height` (the latter two prevent layout
shift while the image loads).
