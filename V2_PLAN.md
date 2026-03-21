# Hope Ignites Application Ecosystem — v2 Plan

## v1 Summary: What We Built

A **static React SPA** that renders an interactive force-directed graph of an organization's technology stack. ~4,200 lines of code, 100+ application nodes, 300+ connections. All data lives in static JavaScript files generated from CSV.

---

## v1 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 18.3.1 |
| Visualization | D3.js | 7.9.0 |
| Styling | Tailwind CSS | 3.4.17 |
| Build Tool | Vite | 5.4.11 |
| User Tour | React Joyride | 2.9.3 |
| PDF Export | jsPDF + autotable | 3.0.3 |
| Markdown | React Markdown | 10.1.0 |

---

## v1 Data Model

**Application Node (25+ fields):**
```
id, name, category, description, tech, cloudProvider, owner,
platform, link, status, aiLayer, dnsLayer, ssoProvider, ssoProtocol,
ssoScim, allTeam, servicesAgreement, observed, nhqOnly, openInternet,
updated, primaryAdmin, secondaryAdmin, contractItem, thirdPartyProvider,
purchaseVendor, ssoGroup
```

**Security Node adds:** `securityClass, zeroTrust, isISP`

**Link:** `source, target, type (data|sso|observe|backup|security), isISPConnection`

**Data source:** Static `.js` files in `src/data/` auto-generated from CSV via `convert-csv.js` / `convert-security-csv.js`

---

## v1 Feature Inventory

**Visualization (D3)**
- Force-directed graph with physics (charge, link distance, collision, category clustering)
- Zoom (0.1x–4x), pan, drag nodes, zoom controls
- Node badges: AI (💡), DNS (🌐), Zero Trust (🛡️), platform badges (M365, SF, CF)
- Glow effects for AI/DNS layer nodes
- Highlighted connections on hover/click
- 5 connection types with distinct colors/dash patterns (data, SSO, observability, backup, security)

**Filtering & Search**
- Category toggle filter (legend-based, shows count)
- Cloud provider dropdown (dynamically generated from data)
- Layer toggles: SSO, Observability, Backup, AI, DNS connections
- Full-text search across 20+ fields (table view)

**View Modes**
- **Graph view** — D3 force-directed visualization
- **Table view** — sortable/searchable HTML table (desktop) + card layout (mobile)
  - 7 sortable columns, sort direction indicators

**Detail Card (right panel)**
- All 25+ fields displayed
- Complexity score (calculated from connections, features, security class)
- Admin contacts with mailto: and Teams chat links
- Presence status indicators (available, busy, away, DND, offline)

**URL Deep Linking**
- `/{appId}` opens specific app's detail card
- `history.pushState()` for SPA navigation without page reload
- `popstate` listener for browser back/forward

**Tabs**
- Applications ecosystem (100+ nodes)
- Security ecosystem (separate dataset, same component)

**Export**
- PDF (category-grouped, paginated, jsPDF)
- CSV download (raw data)

**CSV Editor** *(dev mode only, `/edit` route)*
- Form-based editor for all 25+ fields
- Add/edit/delete/duplicate nodes
- Connection builder interface
- CSV + PDF export

**Other**
- Dark mode (persisted in `localStorage`)
- Fullscreen mode
- First-time user tour (4 steps, React Joyride, persisted in `localStorage`)
- In-app documentation modal (Markdown)
- Feedback widget (Monday.com iframe)
- Google Analytics + Cloudflare Analytics
- 13 admin contacts centralized in `adminData.js`

---

## v1 File Structure

```
src/
├── main.jsx              # Entry point, routing between app and CSV editor
├── App.jsx               # Tab switcher (Applications / Security)
├── EcosystemDiagram.jsx  # Main component (~3700 lines, 149 KB)
├── CSVEditor.jsx         # Dev-only data editor
├── adminData.js          # Admin contacts lookup table
├── index.css             # Global styles + Tailwind
└── data/
    ├── applications.js   # ~3500 lines, auto-generated from CSV
    └── security.js       # ~750 lines, auto-generated from CSV
convert-csv.js            # CSV → JS data file conversion
convert-security-csv.js   # Security CSV → JS data file conversion
convert-excel.js          # Excel → CSV conversion
generate-rag-json.js      # Generates AI/RAG-friendly JSON export
```

---

## What to Bring Into v2

**Data conversion scripts** — still useful for initial DB seeding:
- `convert-csv.js`
- `convert-security-csv.js`
- `convert-excel.js`
- `generate-rag-json.js`

> **Note:** These currently output JS module files (`export const nodes = [...]`). For v2, update them to output **JSON** so they can be used as database seed files directly.

**Core frontend files** — visualization stays largely intact, will need API wiring:
- `src/EcosystemDiagram.jsx` — main component, swap static imports for API calls
- `src/App.jsx` — tab switcher, minimal changes
- `src/main.jsx` — entry point
- `src/adminData.js` — fine as static for now, can migrate to DB later
- `src/index.css`
- `src/data/applications.js` + `src/data/security.js` — use as seed data for the backend DB

**Config files** — copy directly:
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `package.json`
- `index.html`

**Leave behind:**
- `src/CSVEditor.jsx` — replaced by proper backend CRUD UI in v2
- Raw CSV source files — one-time use for seeding, don't need to live in the repo

---

## v2 Backend — TBD

> Backend architecture to be defined. Key decisions needed:
> - Backend framework / platform
> - Authentication and roles
> - Hosting target
> - Real-time vs. request/response data updates
> - Whether `adminData.js` moves to the database
