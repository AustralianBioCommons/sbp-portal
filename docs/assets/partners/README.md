# Partner logos

Drop the partner logo files here with these exact names — `docs/index.html`
references them directly.

| File          | Institution                 | Notes                                    |
| ------------- | --------------------------- | ---------------------------------------- |
| `unsw.png`    | UNSW Sydney                 | dark-on-transparent PNG                  |
| `unimelb.png` | The University of Melbourne | dark-on-transparent PNG                  |

The strip renders on a white surface in both light and dark themes, so supply
**dark-on-transparent** variants. A white-on-transparent logo will be invisible.

Logos are laid out at a uniform rendered height (`4.5rem`), so differing source
dimensions are fine — but keep them reasonably high resolution (≥ 2× the
rendered height) so they stay sharp on retina displays.

To add another partner, copy an existing `<img>` in the `.partners` block of
`docs/index.html` and set `src`, `alt`, and the intrinsic `width`/`height`
(the latter two prevent layout shift while the image loads).
