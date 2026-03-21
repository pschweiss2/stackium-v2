# Stackium v2 — Architecture Plan

> **Status: PLANNING PHASE** — Open questions resolved. Ready to begin scaffolding after final review.

---

## What This App Is

**Stackium** — a white-labelable, interactive visualization of an organization's technology stack. Admins manage 100+ apps and 300+ connections through a headless CMS; users explore them as a force-directed D3.js graph with filtering, search, detail cards, and export.

**The v1 problem:** All data lives in static JavaScript files generated from CSV. Adding or editing an app requires editing a CSV locally, running a conversion script, and redeploying. There's no multi-user editing, no live CRUD, and no access control.

**The v2 goal:** Add a backend so multiple users can manage app listings and connections through a friendly web interface — without touching code or CSV files. Additionally, make the app white-labelable so any organization can deploy it with their own branding.

---

## Guiding Principles

- **Keep it simple.** No custom databases, no complex backend code. Use tools designed for content management.
- **Keep costs low.** Cloudflare Pages is free. A $5/month VPS is the ceiling for backend hosting.
- **Keep it manageable.** Non-technical staff should be able to add/edit/delete apps without developer help.
- **Don't over-engineer.** Solve the current problem. Docker/containerization is a future iteration.
- **Preserve the frontend.** The D3.js visualization is the core product. v2 wires it to live data — it doesn't rebuild it.
- **Design for white-labeling.** Any org-specific value (logo, colors, domain, analytics) should be data, not hardcoded.

---

## v2 Goals (MVP)

1. **Live CRUD** — Add, edit, delete application nodes and connections through a web UI
2. **Multi-user access** — Multiple admins can log in and manage data
3. **No redeploy required** — Data changes reflect in the frontend without a new build/deploy
4. **Import from existing data** — Seed the backend with current CSV/JS data
5. **All existing frontend features preserved** — Graph, filters, search, export, deep links, dark mode, etc.
6. **White-label foundation** — Logo, org name, colors, and analytics stored in CMS and consumed by the frontend
7. **Viewer authentication** — Frontend protected behind Cloudflare Access (org login required)

---

## Resolved Architecture Decisions

| Decision | Choice | Notes |
|---|---|---|
| API domain | `api.stackium.tech` | Directus instance on Linode, pointed here |
| Frontend auth | Cloudflare Access | Org login required to view the frontend |
| Admin email domain | `stackium.tech` (default) | Configurable via branding config; future UI control |
| v1 hosting | Cloudflare Pages | v2 frontend stays on Cloudflare Pages |
| Security ecosystem | Flag on `applications` | `is_security` boolean + security-specific fields added to the same collection |
| Connections editing | Directus UI | Connections managed via Directus relational UI, not just CSV import |

---

## Chosen Architecture: Directus + Cloudflare Pages

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | React + D3.js (existing) | Cloudflare Pages | Free |
| Viewer Auth | Cloudflare Access | Cloudflare | Free tier |
| CMS / API | Directus (headless CMS) | Linode Nanode 1GB | ~$5/month |
| Database | SQLite (Directus-managed) | Same Linode VPS | Included |
| Admin Auth | Directus built-in users + roles | Same Linode VPS | Included |
| SSL | Let's Encrypt via Nginx | Same Linode VPS | Free |

**Why Directus:**
- Purpose-built headless CMS — no custom database schema coding needed
- GUI-based data editor (spreadsheet-style) — familiar to non-technical staff
- CSV import for initial data seeding
- Many-to-many relationships natively (app ↔ connection links)
- Built-in user management with role-based access control
- REST API + GraphQL out of the box
- SQLite support — no separate database server needed on a $5 VPS
- Open source, self-hosted, no SaaS fees
- File management built-in — upload logos and assets directly

**Why Cloudflare Access for viewers:**
- Zero infrastructure — no auth server to run
- Works in front of Cloudflare Pages natively
- Org SSO / email domain rules (e.g., require `@stackium.tech` to access)
- Free tier covers this use case

---

## Data Architecture (v2)

### Collections (Directus — equivalent to tables)

**`applications`** — all app nodes, including security ecosystem
```
id, name, category, description, tech, cloudProvider, owner,
platform, link, status, aiLayer, dnsLayer, ssoProvider, ssoProtocol,
ssoScim, allTeam, servicesAgreement, observed, nhqOnly, openInternet,
updated, contractItem, thirdPartyProvider, purchaseVendor, ssoGroup,

-- security fields (null for non-security nodes)
is_security     boolean (flag: true = security ecosystem node)
securityClass   string
zeroTrust       boolean
isISP           boolean
```

> Security nodes are **not** a separate collection. The `is_security` flag filters them in the frontend, matching the current two-tab behavior with a single API call.

---

**`connections`** — directional links between applications
```
id
source_id    → applications.id
target_id    → applications.id
type         enum: data | sso | observe | backup | security
isISPConnection  boolean
```

Connections are editable via the Directus UI (relational dropdowns to select source/target app, type selector). Bulk import via CSV is also supported for initial seeding.

---

**`admins`** — app admin contacts (migrated from `adminData.js`)
```
id, name, email, teams_link, title
```

---

**`application_admins`** — junction: which admins own which apps
```
application_id  → applications.id
admin_id        → admins.id
role            enum: primary | secondary
```

---

**`branding`** — white-label configuration (singleton collection — one record)
```
org_name            string    "Hope Ignites" / "Acme Corp" / etc.
app_title           string    Browser tab title
logo_url            file      Light-mode logo (Directus Files)
logo_dark_url       file      Dark-mode logo (Directus Files)
favicon_url         file      Favicon (Directus Files)
primary_color       string    Hex: #1e40af
accent_color        string    Hex: #3b82f6
admin_email_domain  string    stackium.tech (used for Directus invite flow)
support_email       string    help@stackium.tech
feedback_url        string    Monday.com or other feedback widget URL
analytics_ga_id     string    Google Analytics measurement ID
analytics_cf_token  string    Cloudflare Web Analytics token
```

---

### API Shape (what the frontend will consume)

```
GET /items/applications?fields=*,admins.*&limit=-1
GET /items/connections?limit=-1
GET /items/branding
```

The `branding` endpoint is public (read-only) and fetched once on app mount. All other endpoints are also public read-only (Directus public role with read access on these collections). Writes require Directus authentication.

---

## White-Label Architecture

### Philosophy

Any value that is organization-specific should live in the `branding` collection — not hardcoded in the source. In v2, a developer wires the frontend to consume these values. In a future iteration, non-technical admins will be able to update them through a dedicated UI.

### How It Works in v2

1. On app mount, the frontend fetches `GET /items/branding` from the Directus API
2. CSS custom properties are set dynamically:
   ```js
   document.documentElement.style.setProperty('--color-primary', branding.primary_color)
   document.documentElement.style.setProperty('--color-accent', branding.accent_color)
   ```
3. Logo `<img>` src is set from `branding.logo_url` / `branding.logo_dark_url`
4. `<title>` and favicon are set from `branding.app_title` / `branding.favicon_url`
5. Analytics are initialized with `branding.analytics_ga_id` and `branding.analytics_cf_token`
6. Feedback widget URL is loaded from `branding.feedback_url`

### What Requires Code in v2

In v2, the following still require a code/config change (not a UI-only change):
- Cloudflare Access policy (which email domains/users can view the frontend)
- Directus admin email domain for inviting new users (env var on the VPS)
- DNS records pointing to the Linode VPS / Cloudflare Pages

### White-Label Roadmap (v3+)

| Feature | v2 | v3+ |
|---|---|---|
| Logo upload | Directus Files UI | Same |
| Color theme | Directus branding record | Live preview editor |
| Org name / title | Directus branding record | Same |
| Analytics IDs | Directus branding record | Same |
| Admin email domain | Env var on VPS | Directus branding record |
| Viewer auth config | Cloudflare Access dashboard | Configurable via UI |
| Multi-tenant (multiple orgs, one instance) | Not in scope | Docker + tenant routing |

### Multi-Tenant Future Path

When Stackium is deployed for multiple organizations:

- Each org gets their own **Directus instance** (easiest: Docker + Linode per org)
- OR one Directus instance with tenant-scoped collections (more complex, more efficient)
- The Docker-first approach (planned for v3) makes per-org deployments fast and repeatable
- Each tenant's `branding` collection holds their full identity — no org-specific code needed

---

## Hosting Setup (Linode $5/month)

**Linode Nanode 1GB** specs: 1 vCPU, 1GB RAM, 25GB SSD, 1TB transfer.

Stack on the VPS:
- **Directus** — Node.js process (API + admin UI)
- **SQLite** — file-based database (no separate server)
- **Nginx** — reverse proxy, SSL termination
- **PM2** — process management, auto-restart
- **Certbot** — Let's Encrypt SSL for `api.stackium.tech`

DNS: `api.stackium.tech` A record → Linode VPS IP

---

## User Roles

| Role | Access | How |
|---|---|---|
| Viewer | Read-only frontend | Cloudflare Access (org login) |
| Editor | Add/edit/delete apps and connections | Directus user account |
| Admin | Full Directus access + user management + branding | Directus admin account |

Directus handles editor/admin roles natively. Cloudflare Access handles viewer auth without any backend code.

---

## Frontend Changes Required

The existing `EcosystemDiagram.jsx` (~3,344 lines) stays largely intact. Changes are scoped to:

1. **Remove** static imports from `src/data/applications.js` and `src/data/security.js`
2. **Add** `useEffect` + `fetch` to load all data from Directus API on mount
3. **Add** branding fetch on mount — apply CSS vars, logo, title, favicon, analytics
4. **Add** loading and error states for data fetch
5. **Replace** the two separate datasets (applications + security) with one `applications` collection filtered by `is_security` flag
6. **Remove** `/edit` CSV Editor route — replaced by Directus admin at `api.stackium.tech/admin`
7. **Update** conversion scripts to output JSON for seeding

**What does NOT change:**
- D3.js visualization logic
- All filtering, search, view modes, URL deep-linking
- PDF/CSV export
- Dark mode, fullscreen, tour, documentation modal
- Admin contact display (once migrated to Directus)

---

## Migration Path from v1 Data

1. Update `convert-csv.js` to output JSON (not JS module syntax)
2. Update `convert-security-csv.js` similarly, adding `is_security: true` to each record
3. Seed Directus `applications` collection via JSON import (Directus supports this natively)
4. Seed `connections` collection
5. Seed `admins` collection from `adminData.js`
6. Create initial `branding` record (org name, logo, colors)
7. Verify all 100+ nodes and 300+ connections imported correctly
8. Flip the frontend to use the API

---

## Future Iteration: Docker

Once v2 is stable, containerizing is straightforward:

- `Dockerfile` for Directus + SQLite
- `docker-compose.yml` — Directus + Nginx
- Named volume for SQLite file persistence
- Env file for secrets (DB path, admin credentials, public URL)
- Deployable to any VPS or container platform (Linode, DigitalOcean, Railway, Fly.io, Render)

This makes spinning up a new org instance a `docker compose up` operation. Intentionally out of scope for v2 — build the backend first, containerize later.

---

## Files to Carry Forward from v1

| File | Action |
|---|---|
| `src/EcosystemDiagram.jsx` | Keep — swap static imports for API fetch, add branding fetch |
| `src/App.jsx` | Keep — minimal changes |
| `src/main.jsx` | Keep — remove CSV editor route |
| `src/adminData.js` | Keep temporarily — migrate to Directus `admins` collection |
| `src/index.css` | Keep — add CSS custom property vars for theming |
| `convert-csv.js` | Update to output JSON |
| `convert-security-csv.js` | Update to output JSON, add `is_security: true` |
| `convert-excel.js` | Keep for data prep |
| `generate-rag-json.js` | Keep for AI export use case |
| `V2_PLAN.md` | Superseded by this file — can be removed |
| `src/CSVEditor.jsx` | **Remove** — replaced by Directus admin UI |
| `src/data/applications.js` | **Remove** after seeding Directus |
| `src/data/security.js` | **Remove** after seeding Directus |

---

## What We Are NOT Doing in v2

- Custom REST API or GraphQL server written from scratch
- PostgreSQL or MySQL (SQLite is sufficient at this scale)
- Docker/containerization (future iteration)
- Mobile app
- Real-time collaborative editing
- Custom authentication system
- Multi-tenant routing
- Full white-label UI (branding set in Directus data, not a dedicated config UI — that's v3)
- Rebuilding the D3.js visualization

---

## Next Steps (Scaffolding Order)

1. Set up Linode Nanode + install Directus + configure Nginx + SSL for `api.stackium.tech`
2. Create Directus collections: `applications`, `connections`, `admins`, `application_admins`, `branding`
3. Set public read permissions on all collections (write requires auth)
4. Update conversion scripts to output JSON
5. Seed data into Directus from existing CSV/JS files
6. Create initial `branding` record
7. Update frontend: data fetch, branding fetch, CSS var application, security flag filter
8. Remove `CSVEditor.jsx`, static data files, and `/edit` route
9. Deploy frontend to Cloudflare Pages (pointing to existing v1 project)
10. Configure Cloudflare Access in front of the Pages project
11. Test end-to-end: graph loads, branding applies, editor CRUD works
12. Create Directus editor accounts (`@stackium.tech`)
