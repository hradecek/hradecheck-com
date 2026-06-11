# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal website built with [Hugo](https://gohugo.io/) using the [Poison](https://github.com/lukeorth/poison) theme. The theme is installed as a git submodule at `themes/poison`.

## Build & Development Commands

- **Dev server** (includes drafts, expired, and future content): `npm run dev` (runs `hugo server --minify -D -E -F`)
- **Production build**: `hugo -d ./public`
- **Update theme submodule**: `git submodule update --remote --merge`

Hugo version required: >= 0.87.0 (CI uses 0.142.0 with extended mode).

## Architecture

### Configuration

Single config file at `hugo.toml` containing site settings, theme params, sidebar menu, social links, and taxonomies.

### Content

- **Posts**: flat markdown files in `content/posts/` (e.g. `content/posts/my-post.md`)
- **Single pages** (e.g. About): use `_index.md` with `layout: single` front matter (e.g. `content/about/_index.md`)
- Sidebar menu items are defined in `hugo.toml` under `[params] menu`

### Taxonomies

Two taxonomies are configured: `tags`, `series`.

### Deployment

GitHub Actions workflow (`.github/workflows/pages.yml`) builds and deploys to GitHub Pages on push to `main`. The workflow uses `peaceiris/actions-hugo` for Hugo setup and `actions/deploy-pages` for deployment.
