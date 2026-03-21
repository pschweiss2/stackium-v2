# Stackium v2 — Architecture Plan

> **Status: PLANNING PHASE** — No code written yet. Review and iterate on this plan before scaffolding begins.

---

## What This App Is

**Hope Ignites Application Ecosystem** — an interactive visualization of an organization's technology stack. Users can explore 100+ apps and their 300+ connections as a force-directed D3.js graph, filter by category/cloud/layer, view detailed metadata, and export to PDF or CSV.

**The v1 problem:** All data lives in static JavaScript files generated from CSV. Adding or editing an app requires editing a CSV locally, running a conversion script, and redeploying. There's no multi-user editing, no live CRUD, and no access control.

**The v2 goal:** Add a backend so multiple users can manage app listings and connections through a friendly web interface — without touching code or CSV files.

---

## Guiding Principles

- **Keep it simple.** No custom databases, no complex backend code. Use tools designed for content management.
- **Keep costs low.** Cloudflare Pages is free. A $5/month VPS is the ceiling for backend hosting.
- **Keep it manageable.** Non-technical staff should be able to add/edit/delete apps without developer help.
- **Don't over-engineer.** Solve the current problem. Docker/containerization is a future iteration.
- **Preserve the frontend.** The D3.js visualization is the core product. v2 wires it to live data — it doesn't rebuild it.

---

## v2 Goals (MVP)

1. **Live CRUD** — Add, edit, delete application nodes and connections through a web UI
2. **Multi-user access** — Multiple admins can log in and manage data
3. **No redeploy required** — Data changes reflect in the frontend without a new build/deploy
4. **Import from existing data** — Seed the backend with current CSV/JS data
5. **All existing frontend features preserved** — Graph, filters, search, export, deep links, dark mode, etc.

---

## Recommended Architecture

### Option A — Directus + Cloudflare Pages *(Recommended)*

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | React + D3.js (existing) | Cloudflare Pages | Free |
| CMS / API | Directus (headless CMS) | Linode Nanode 1GB | ~$5/month |
| Database | SQLite (Directus-managed) | Same Linode VPS | Included |
| Auth (admin) | Directus built-in users + roles | Same Linode VPS | Included |
| Auth (viewers) | Cloudflare Access (optional) | Cloudflare | Free tier |

**Why Directus:**
- Purpose-built headless CMS — no custom database schema coding needed
- GUI-based data editor (spreadsheet-style) — familiar to anyone who has used Excel
- Supports CSV import directly (easy data seeding from current files)
- Handles many-to-many relationships natively (perfect for app ↔ connection links)
- Built-in user management with role-based access control
- REST API + GraphQL out of the box — frontend just fetches from the API
- SQLite support means no separate database server needed on the $5 VPS
- Open source, self-hosted, no SaaS fees

**Why Cloudflare Pages for frontend:**
- Already suited for this static-ish React app
- Free, global CDN, automatic deploys from git
- Can add Cloudflare Access in front if viewer auth is ever needed

---

### Option B — TinaCMS + Cloudflare Pages *(Zero cost, but tradeoffs)*

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | React + D3.js (existing) | Cloudflare Pages | Free |
| CMS | TinaCMS Cloud | TinaCloud | Free tier |
| Data storage | JSON files in Git | GitHub | Free |

**Why this could work:**
- Zero hosting cost — TinaCMS Cloud free tier, Cloudflare Pages free
- Data stored as JSON in the git repo — version controlled automatically
- Visual editor integrated into the site

**Why this is risky for this app:**
- TinaCMS is optimized for Markdown/blog content, not complex relational data
- Managing 100+ app nodes with 25+ fields and 300+ connections via a git-backed CMS may become painful
- No true multi-user concurrent editing (git merge conflicts become data conflicts)
- Less suitable for the spreadsheet-style bulk editing this data needs

---

### Option C — Headless WordPress + Cloudflare Pages

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | React + D3.js (existing) | Cloudflare Pages | Free |
| CMS | WordPress (headless) | Linode Nanode 1GB | ~$5/month |
| API | WP REST API or WPGraphQL | Same Linode | Included |
| Database | MySQL (WP default) | Same Linode | Included |

**Pros:** Familiar UI, huge plugin ecosystem, many hosts know how to manage it.

**Cons:** WordPress is overbuilt for this use case. Custom post types for app nodes + connection relationships add friction. Plugin maintenance overhead. MySQL needs more RAM than SQLite on a $5 VPS.

---

## Recommended Decision: **Option A (Directus)**

Directus is the best fit for this specific use case because the data model here is essentially a relational database in disguise (apps, admins, connections, categories) and Directus was built exactly for managing that kind of structured content without writing backend code.

---

## Data Architecture (v2)

The existing 25+ field data model translates cleanly into Directus collections:

### Collections (equivalent to tables)

**`applications`** — core app nodes
```
id, name, category, description, tech, cloudProvider, owner,
platform, link, status, aiLayer, dnsLayer, ssoProvider, ssoProtocol,
ssoScim, allTeam, servicesAgreement, observed, nhqOnly, openInternet,
updated, contractItem, thirdPartyProvider, purchaseVendor, ssoGroup
```

**`connections`** — links between applications
```
id, source (→ applications), target (→ applications),
type (data|sso|observe|backup|security), isISPConnection
```

**`admins`** — the 13 admin contacts (currently in adminData.js)
```
id, name, email, teams_link, title
```

**`application_admins`** — junction: which admins manage which apps
```
application_id, admin_id, role (primary|secondary)
```

**`security_nodes`** — security ecosystem (separate from applications)
```
inherits application fields + securityClass, zeroTrust, isISP
```

### API Shape (what the frontend will consume)

The frontend will replace static `import { nodes } from './data/applications.js'` with `fetch()` calls to Directus:

```
GET /items/applications?fields=*,admins.*&limit=-1
GET /items/connections?limit=-1
GET /items/security_nodes?fields=*&limit=-1
```

---

## Hosting Setup (Linode $5/month)

**Linode Nanode 1GB** (`$5/month`) specs: 1 vCPU, 1GB RAM, 25GB SSD, 1TB transfer.

This is sufficient for:
- Directus running as a Node.js process
- SQLite database (file-based, no separate server)
- Nginx as reverse proxy (optional, for SSL termination)
- PM2 for process management

SSL via **Let's Encrypt** (free). Domain pointed at the Linode VPS for the API subdomain (e.g., `api.stackium.yourdomain.com`).

---

## Frontend Changes Required

The existing `EcosystemDiagram.jsx` (~3,344 lines) stays largely intact. The changes are confined to data fetching:

1. **Remove** static imports from `src/data/applications.js` and `src/data/security.js`
2. **Add** `useEffect` + `fetch` (or a lightweight client like `ky` or native `fetch`) to load from Directus API on mount
3. **Add** loading and error states
4. **Wire up** the existing CSV Editor route (`/edit`) to become the Directus admin panel URL instead — or remove and point users to the Directus UI directly
5. **Update** CSV conversion scripts to output JSON for seeding Directus

**What does NOT change:**
- D3.js visualization logic
- All filtering, search, view modes
- URL deep-linking
- PDF/CSV export
- Dark mode, tour, analytics
- Admin contact display (once migrated to Directus)

---

## User Roles (v2)

| Role | Access | How |
|---|---|---|
| Viewer | Read-only frontend | Public Cloudflare Pages URL |
| Editor | Can add/edit/delete apps and connections | Directus login (user account) |
| Admin | Full Directus access + user management | Directus admin account |

Directus handles all of this natively without custom auth code.

---

## Migration Path from v1 Data

1. Export current `applications.js` and `security.js` data to JSON
2. Update `convert-csv.js` to output JSON instead of JS module syntax
3. Import JSON seed files directly into Directus via its CSV/JSON import tool
4. Verify all 100+ nodes and 300+ connections imported correctly
5. Flip the frontend to use the API

---

## Future Iteration: Docker

Once v2 is stable and deployed, containerizing is straightforward:

- `Dockerfile` for Directus + SQLite
- `docker-compose.yml` to orchestrate Directus + Nginx
- Data volume for SQLite persistence
- Can run on any VPS or container platform (Linode, DigitalOcean, Railway, Render, Fly.io)

This is intentionally out of scope for v2. Build the backend first, containerize later.

---

## Open Questions to Resolve Before Coding

1. **Domain / subdomain** — Where will the API live? (e.g., `api.stackium.org`, or a dedicated domain)
2. **Viewer auth** — Should the frontend be public, or behind Cloudflare Access requiring an org login?
3. **Admin email** — What email domain will admin accounts use? (for Directus invite flow)
4. **Existing hosting** — Where is v1 currently hosted? (Cloudflare Pages? GitHub Pages?) — determines what changes for the frontend deploy
5. **Security tab** — Should `security_nodes` be a separate collection in Directus, or the same `applications` collection with a flag/type field?
6. **Connections in the UI** — Directus's default UI handles relations well, but 300+ connections may need a custom import. Should connections be editable via the Directus UI or only via CSV import?

---

## What We Are NOT Doing in v2

- Custom REST API or GraphQL server written from scratch
- PostgreSQL or MySQL (SQLite is sufficient at this scale)
- Docker/containerization (future iteration)
- Mobile app
- Real-time collaborative editing (not needed yet)
- Custom authentication system
- Rebuilding the D3.js visualization

---

## Files to Carry Forward from v1

| File | Action |
|---|---|
| `src/EcosystemDiagram.jsx` | Keep, swap static imports for API fetch |
| `src/App.jsx` | Keep, minimal changes |
| `src/main.jsx` | Keep, remove CSV editor route |
| `src/adminData.js` | Keep temporarily, migrate to Directus later |
| `src/index.css` | Keep as-is |
| `convert-csv.js` | Update to output JSON for seeding |
| `convert-security-csv.js` | Update to output JSON for seeding |
| `convert-excel.js` | Keep for data prep |
| `generate-rag-json.js` | Keep for AI export use case |
| `V2_PLAN.md` | Superseded by this file |
| `src/CSVEditor.jsx` | Remove — replaced by Directus admin UI |
| `src/data/applications.js` | Remove after seeding Directus |
| `src/data/security.js` | Remove after seeding Directus |

---

## Next Steps (After Plan Approval)

1. Answer the open questions above
2. Scaffold Directus collections (schema design)
3. Set up Linode + Directus install
4. Seed data from existing CSV/JS files
5. Update frontend to fetch from API
6. Deploy frontend to Cloudflare Pages
7. Test end-to-end
8. Add editor user accounts
