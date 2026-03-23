# Stackium v2

**An interactive, white-labelable visualization of your organization's technology stack.**

Stackium renders 100+ applications and 300+ connections as a force-directed D3.js graph with filtering, search, detail cards, and export. v2 replaces static CSV-generated data files with a live headless CMS backend so non-technical admins can manage the graph without touching code.

---

## Architecture

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React + D3.js | Cloudflare Pages (free) |
| Viewer Auth | Cloudflare Access | Cloudflare (free tier) |
| CMS / API | Directus (headless CMS) | Linode Nanode ~$5/mo |
| Database | SQLite (Directus-managed) | Same VPS |
| SSL | Let's Encrypt + Nginx | Same VPS |

The frontend fetches all data from a self-hosted [Directus](https://directus.io) instance at `api.stackium.tech`. No custom backend code — Directus handles the REST API, admin UI, user management, and file storage out of the box.

---

## Features

- **Force-directed graph** — D3.js visualization of app nodes and connections
- **Two tabs** — Application Ecosystem and Security Ecosystem (filtered from one dataset via `is_security` flag)
- **Filtering** — by category, platform, cloud provider, status, and more
- **Search** — fuzzy search across all app names and metadata
- **Detail cards** — click any node to see full app details and admin contacts
- **PDF / CSV export** — export the current view
- **Dark mode** — full dark theme support
- **Deep links** — shareable URLs that restore filter/search state
- **Guided tour** — built-in onboarding walkthrough
- **White-label** — logo, colors, org name, and analytics loaded from Directus `branding` collection
- **Live CRUD** — add/edit/delete apps and connections through Directus admin UI, no redeploy needed

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running Directus instance (see [Directus setup](#directus-setup))

### Local Development

```bash
# Install dependencies
npm install

# Set your Directus API URL
cp .env.example .env
# Edit .env: VITE_DIRECTUS_URL=https://api.stackium.tech

# Start dev server
npm run dev
```

### Build

```bash
npm run build
```

Output goes to `dist/`. Deploy to Cloudflare Pages or any static host.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_DIRECTUS_URL` | `https://api.stackium.tech` | Directus instance base URL |

---

## Directus Setup

The schema for all Directus collections is defined in [`directus-schema.json`](./directus-schema.json).

### Collections

| Collection | Type | Description |
|---|---|---|
| `applications` | List | All app nodes (both ecosystem and security, separated by `is_security` flag) |
| `connections` | List | Directional links between apps (source → target, typed) |
| `admins` | List | Admin contacts |
| `application_admins` | Junction | Which admins own which apps (primary / secondary role) |
| `platforms` | List | Platform suites (M365, Salesforce, etc.) — M2O lookup on `applications` |
| `third_party_providers` | List | Third-party vendors — M2O lookup on `applications` |
| `branding` | Singleton | White-label config (logo, colors, org name, analytics IDs) |
| `documentation` | Singleton | Markdown content shown in the in-app Documentation modal |

### Permissions

Set the **Public** role to have **read** access on all collections listed above. Writes require a Directus user account.

### API Endpoints Used

```
GET /items/applications?fields=*,admins.*&limit=-1
GET /items/connections?limit=-1
GET /items/branding
GET /items/documentation
```

---

## Data Migration from v1

If migrating from v1 static data files:

1. Update `convert-csv.js` to output JSON (not JS module syntax)
2. Update `convert-security-csv.js` similarly, adding `"is_security": true` to each record
3. Import JSON into Directus via **Settings → Import / Export**
4. Seed `admins` from `src/adminData.js`
5. Create the initial `branding` record
6. Verify all nodes and connections imported correctly

Utility scripts in the repo root:

| Script | Purpose |
|---|---|
| `convert-csv.js` | Convert applications CSV → JSON for Directus import |
| `convert-security-csv.js` | Convert security CSV → JSON, sets `is_security: true` |
| `convert-excel.js` | Excel → CSV prep step |
| `generate-rag-json.js` | Export graph data as RAG-friendly JSON for AI use cases |

---

## White-Labeling

All org-specific values live in the `branding` Directus collection. On app mount, the frontend:

1. Fetches `GET /items/branding`
2. Sets CSS custom properties (`--color-primary`, `--color-accent`)
3. Swaps the logo `<img>` src (light + dark variants)
4. Updates `<title>` and favicon
5. Initializes Google Analytics and Cloudflare Web Analytics if IDs are present

To deploy for a new organization: spin up a new Directus instance, populate `branding`, and point the frontend `VITE_DIRECTUS_URL` at it.

---

## User Roles

| Role | Access | How |
|---|---|---|
| Viewer | Read-only frontend | Cloudflare Access (org SSO / email domain) |
| Editor | Add / edit / delete apps and connections | Directus user account |
| Admin | Full Directus access + user management + branding | Directus admin account |

---

## Tech Stack

- [React 18](https://react.dev)
- [D3.js v7](https://d3js.org)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Directus](https://directus.io) — headless CMS / API
- [Cloudflare Pages](https://pages.cloudflare.com) — frontend hosting
- [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/) — viewer authentication

---

## License

MIT
