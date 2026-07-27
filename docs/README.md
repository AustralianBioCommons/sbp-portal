# Public project page

This folder is the public SBP project page served at
<https://australianbiocommons.github.io/sbp-portal/>.

## How it is published

GitHub Pages is configured under Settings → Pages as *Deploy from a branch* →
branch **`dev`**, folder **`/docs`**.

GitHub serves these files directly — there is no build step and no publishing
workflow. **Merging a change to `docs/` into `dev` publishes it immediately**,
with no review gate between merge and live.

## Layout

```
index.html          the page — self-contained, all CSS inline
.nojekyll           serve the files as-is, skip Jekyll processing
assets/sbp-logo.png header logo
assets/partners/    partner logos — see the README in that folder
```

## Editing

Plain HTML with inline CSS and no build step, so opening `index.html` in a
browser previews it exactly as it will be served.

Paths inside `index.html` are **relative** (`assets/…`, not `/assets/…`).
Keep them that way: the site is served from the `/sbp-portal/` subpath, so a
leading slash would resolve to the domain root and 404.

## Do not re-add a gh-pages deploy workflow

`.github/workflows/ci-deploy.yml` once contained a `deploy` job using
`peaceiris/actions-gh-pages`, which published an Angular build to the
`gh-pages` branch on every push to `dev` — including from pull requests. That
build was never the public site: the portal is released to S3 + CloudFront by
`build_and_deploy.yml`, and the copy pushed to `gh-pages` was wired to dev
Auth0 and the dev API. The job has been removed and the `gh-pages` branch is no
longer used.

## Not the portal application

The portal itself is not served from here. It is released to S3 + CloudFront by
`.github/workflows/build_and_deploy.yml` on the `dev` and `staging` branches,
with per-environment config injected at release time.
