# Stackium v2 — New Org Deployment Guide

This guide walks through deploying a fresh Stackium v2 instance for a new organization: Linode VPS (Directus + SQLite), Cloudflare Pages (frontend), and Cloudflare Access (viewer auth).

**Time estimate:** ~2–3 hours for a first deployment.

---

## Prerequisites

- A domain or subdomain you control (e.g., `acme.stackium.tech` for the API, `app.acme.com` for the frontend)
- A Cloudflare account (free tier is sufficient)
- A Linode account
- SSH key pair generated locally
- Node.js 18+ installed locally (for running conversion scripts)
- This repo cloned locally

---

## Part 1 — Linode VPS (Directus Backend)

### 1.1 Create the Nanode

1. Log in to Linode → **Create Linode**
2. Settings:
   - **Image:** Ubuntu 22.04 LTS
   - **Region:** closest to your org's users
   - **Plan:** Nanode 1GB ($5/month)
   - **Label:** `stackium-[orgname]`
   - **Root password:** set a strong one, save it
   - **SSH keys:** add your public key
3. Click **Create Linode** and wait ~60 seconds for it to boot.
4. Note the **IPv4 address**.

### 1.2 Point DNS to the VPS

In Cloudflare (or your DNS provider), create an **A record**:

```
Type: A
Name: api          (e.g. api.acme.stackium.tech)
Value: [Linode IPv4]
Proxy: Proxied (orange cloud)
TTL: Auto
```

Also set the **SSL/TLS mode** for the zone to **Full (Strict)**:
Cloudflare Dashboard → your domain → **SSL/TLS → Overview → Full (Strict)**

> Full (Strict) means Cloudflare encrypts traffic to your VPS and validates the certificate on the origin. Without this, Cloudflare would accept an invalid cert, which defeats the point of encryption between Cloudflare and the VPS.

Wait a few minutes for DNS to propagate before continuing.

### 1.3 SSH In and Provision the Server

```bash
ssh root@[Linode IPv4]
```

Update the system and install dependencies:

```bash
apt update && apt upgrade -y
apt install -y nginx curl git ufw
```

Install Node.js 22 via NodeSource (Directus 11+ requires Node 22):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # should print v22.x
```

Install PM2 globally:

```bash
npm install -g pm2
```

### 1.4 Configure the Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### 1.5 Obtain a Cloudflare Origin Certificate

Because the DNS record is proxied (orange cloud), Cloudflare terminates SSL — not the VPS directly. Use a **Cloudflare Origin Certificate** instead of Let's Encrypt. It's free, valid for 15 years, and requires no renewal automation.

1. Cloudflare Dashboard → your domain → **SSL/TLS → Origin Server**
2. **Create Certificate**
3. Settings:
   - **Private key type:** RSA (2048)
   - **Hostnames:** `api.acme.stackium.tech` (add `*.acme.stackium.tech` if you want a wildcard)
   - **Certificate validity:** 15 years
4. Click **Create** — Cloudflare shows you the **Origin Certificate** and **Private Key**. Copy both — the private key is only shown once.

On the VPS, save them:

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/cert.pem      # paste the Origin Certificate
nano /etc/ssl/cloudflare/key.pem       # paste the Private Key
chmod 600 /etc/ssl/cloudflare/key.pem
```

### 1.6 Install Directus

Install SQLite build dependencies (required for `better-sqlite3` to compile from source):

```bash
apt install -y python3 make g++ libsqlite3-dev
```

Create a dedicated directory and install Directus as a local package:

```bash
mkdir -p /opt/directus
cd /opt/directus
npm init -y
npm install directus better-sqlite3
```

> **Why `better-sqlite3`?** The default `sqlite3` driver ships pre-built binaries that require GLIBC 2.38+, which is only available on Ubuntu 24.04+ or Debian 13+. `better-sqlite3` compiles from source and works on any distro. Directus fully supports it.

> **Do not use `npx directus init`** — the interactive wizard does not persist the install and fails silently on Node engine mismatches. A local install + manual `.env` is more reliable.

Generate two secrets for the `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# run twice — copy both outputs, one for KEY, one for SECRET
```

Create the `.env` file:

```bash
nano /opt/directus/.env
```

Paste and fill in your values:

```env
HOST=127.0.0.1
PORT=8055
PUBLIC_URL=https://api.acme.stackium.tech

DB_CLIENT=better-sqlite3
DB_FILENAME=/opt/directus/database.db

KEY=<64-char hex from above>
SECRET=<64-char hex from above>

ADMIN_EMAIL=admin@acme.com
ADMIN_PASSWORD=<your-strong-password>

CORS_ENABLED=true
CORS_ORIGIN=https://app.acme.com   # your frontend domain

# Optional: tighten rate limits for production
RATE_LIMITER_ENABLED=true
RATE_LIMITER_POINTS=50
RATE_LIMITER_DURATION=1
```

> **Security note:** `HOST=127.0.0.1` ensures Directus only listens on localhost. Nginx proxies to it — nothing hits Directus directly.

Bootstrap the database (creates the SQLite file, runs migrations, creates the admin user):

```bash
npx directus bootstrap
```

### 1.7 Configure Nginx Reverse Proxy

Create the Nginx config for Directus:

```bash
nano /etc/nginx/sites-available/directus
```

Paste:

```nginx
server {
    server_name api.acme.stackium.tech;

    location / {
        proxy_pass http://127.0.0.1:8055;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    listen 443 ssl;
    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

server {
    listen 80;
    server_name api.acme.stackium.tech;
    return 301 https://$host$request_uri;
}
```

Enable it and reload:

```bash
ln -s /etc/nginx/sites-available/directus /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default   # remove the default if it exists
nginx -t
systemctl reload nginx
```

### 1.8 Start Directus with PM2

```bash
cd /opt/directus
pm2 start npx --name directus -- directus start
pm2 save
pm2 startup   # run the printed command to enable auto-start on reboot
```

Verify it's running:

```bash
pm2 status
curl http://127.0.0.1:8055/server/health
# should return {"status":"ok"}
```

Also test from outside: `https://api.acme.stackium.tech/server/health`

---

## Part 2 — Import the Data Model (Schema)

The schema is version-controlled in `directus-schema.json` at the root of this repo. This applies all collections, fields, and relations in one step.

### 2.1 Apply the Schema

From your **local machine** (with the repo cloned), run:

```bash
# Replace URL and token with your new instance values
# Get a token by: POST https://api.acme.stackium.tech/auth/login
# Body: {"email":"admin@acme.com","password":"yourpassword"}
# Copy the access_token from the response

export DIRECTUS_URL=https://api.acme.stackium.tech
export DIRECTUS_TOKEN=<your-access-token>

curl -X POST "$DIRECTUS_URL/schema/apply" \
  -H "Authorization: Bearer $DIRECTUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @directus-schema.json
```

This creates all collections (`applications`, `connections`, `admins`, `application_admins`, `branding`, `platforms`, `third_party_providers`, `documentation`) with correct fields and relations.

> **Verify:** Log in to `https://api.acme.stackium.tech/admin` — you should see all collections in the left sidebar.

### 2.2 Clean Up the Orphaned Junction Table

If you see `applications_application_admins` (grayed out) in the Data Model:

1. **Settings → Data Model**
2. Click the three-dot menu next to `applications_application_admins`
3. **Delete Collection**

This is an artifact from a prior M2M setup attempt and is safe to remove. The explicit `application_admins` collection handles this relationship instead.

---

## Part 3 — Set Public Read Permissions

Directus collections are private by default. The frontend reads data without authentication, so the public role needs read access.

1. **Settings → Access Control → Public**
2. For each of these collections, click the row and enable **Read** access (all fields):
   - `applications`
   - `connections`
   - `admins`
   - `application_admins`
   - `branding`
   - `platforms`
   - `third_party_providers`
   - `documentation`
3. Save.

> Writes remain auth-protected — only Directus users with editor/admin roles can modify data.

---

## Part 4 — Seed Data

### 4.1 Export Data from the Source Instance

If migrating from an existing Directus instance:

1. Log in to the **source** Directus admin
2. For each collection: open it → three-dot menu → **Export Items** → JSON
3. Save each file locally (`applications.json`, `connections.json`, etc.)

If seeding from CSV (first deployment from v1 data):

```bash
# From the repo root on your local machine
node convert-csv.js          # outputs applications.json
node convert-security-csv.js # outputs security.json (with is_security: true)
```

Merge the two JSON arrays into one `applications.json` before importing.

### 4.2 Import Data into the New Instance

In the new Directus admin (`https://api.acme.stackium.tech/admin`):

1. Open the collection (e.g., `platforms`)
2. Three-dot menu → **Import Items**
3. Upload the JSON file
4. Repeat for each collection **in this order** (respects foreign keys):
   1. `platforms`
   2. `third_party_providers`
   3. `applications`
   4. `admins`
   5. `application_admins`
   6. `connections`
   7. `documentation`

### 4.3 Create the Branding Record

`branding` is a singleton — create one record manually:

1. Open **Branding** in the sidebar
2. Fill in all fields for the new org:
   - `org_name`: e.g., "Acme Corp"
   - `app_title`: e.g., "Acme Tech Stack"
   - `logo_url`: upload logo via the file picker
   - `logo_dark_url`: upload dark-mode logo
   - `favicon_url`: upload favicon
   - `primary_color`: e.g., `#1e40af`
   - `accent_color`: e.g., `#3b82f6`
   - `admin_email_domain`: e.g., `acme.com`
   - `support_email`: e.g., `help@acme.com`
   - `analytics_ga_id`: Google Analytics measurement ID (optional)
   - `analytics_cf_token`: Cloudflare Web Analytics token (optional)
   - `feedback_url`: feedback widget URL (optional)
3. Save.

---

## Part 5 — Frontend (Cloudflare Pages)

### 5.1 Set the API URL

In the repo, the frontend reads the API base URL from an environment variable. Before deploying, confirm `EcosystemDiagram.jsx` uses:

```js
const API_BASE = import.meta.env.VITE_API_URL
```

### 5.2 Fork / Connect the Repo

1. Push this repo to a GitHub org the new org controls (or grant them access)
2. Log in to **Cloudflare Dashboard → Pages → Create a project**
3. Connect to GitHub → select the repo
4. Build settings:
   - **Framework preset:** None (or Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. **Environment variables** (Production):
   ```
   VITE_API_URL=https://api.acme.stackium.tech
   ```
6. Click **Save and Deploy**

Cloudflare Pages will assign a `*.pages.dev` URL. You can add a custom domain under **Custom Domains** (e.g., `app.acme.com`).

### 5.3 Custom Domain for the Frontend

In Cloudflare Pages → your project → **Custom Domains**:
1. Add `app.acme.com`
2. Cloudflare will show a CNAME to add — add it in your DNS
3. SSL is automatic via Cloudflare

---

## Part 6 — Cloudflare Access (Viewer Auth)

This puts the frontend behind an org login wall — only authorized users can view the graph.

1. **Cloudflare Dashboard → Zero Trust → Access → Applications**
2. **Add an application → Self-hosted**
3. Settings:
   - **Application name:** Acme Stack Viewer
   - **Application domain:** `app.acme.com` (your Pages custom domain)
   - **Session duration:** 24 hours (adjust to org policy)
4. **Policies → Add a policy:**
   - **Policy name:** Org users
   - **Action:** Allow
   - **Include rule:** `Emails ending in @acme.com`
   - (Or use an identity provider: Google Workspace, Azure AD, Okta, etc.)
5. Save.

> Users hitting `app.acme.com` will now be redirected to a Cloudflare login page before seeing the graph. The Directus API at `api.acme.stackium.tech` is not behind Access — it's public read-only by design.

---

## Part 7 — Create Editor Accounts in Directus

1. Log in to `https://api.acme.stackium.tech/admin` as the admin
2. **Settings → Users → Invite User**
3. Enter the new editor's email address
4. Set role to **Editor** (create this role first if needed: Settings → Roles → Create Role, set permissions to read/write on all app collections but not system settings)
5. The user receives an invite email and sets their own password

---

## Part 8 — Export Schema for Future Updates

When you make schema changes on a live instance and want to version-control them:

```bash
export DIRECTUS_URL=https://api.acme.stackium.tech
export DIRECTUS_TOKEN=<your-access-token>

curl "$DIRECTUS_URL/schema/snapshot" \
  -H "Authorization: Bearer $DIRECTUS_TOKEN" \
  | python3 -m json.tool > directus-schema.json
```

Commit `directus-schema.json` to the repo. This is the source of truth for the data model and can be re-applied to any new instance via `POST /schema/apply`.

---

## Maintenance Reference

### Restart Directus

```bash
ssh root@[Linode IP]
pm2 restart directus
pm2 logs directus   # tail logs
```

### Backup the Database

SQLite is a single file. Back it up with:

```bash
# On the VPS
cp /opt/directus/database.db /opt/directus/backups/database-$(date +%Y%m%d).db
```

Set up a cron job for nightly backups:

```bash
crontab -e
# Add:
0 3 * * * cp /opt/directus/database.db /opt/directus/backups/database-$(date +\%Y\%m\%d).db
```

Consider periodically syncing backups off-VPS (Linode Object Storage, S3, etc.).

### Update Directus

```bash
ssh root@[Linode IP]
cd /opt/directus
npm install directus@latest
pm2 restart directus
```

Always check the [Directus changelog](https://github.com/directus/directus/releases) for breaking changes before upgrading.

### SSL Certificate

The Cloudflare Origin Certificate is valid for 15 years and does not auto-expire or need renewal automation. If you ever need to rotate it (e.g., key compromise):

1. Cloudflare Dashboard → **SSL/TLS → Origin Server → Revoke** the old cert
2. Create a new Origin Certificate (same steps as section 1.5)
3. Replace `/etc/ssl/cloudflare/cert.pem` and `key.pem` on the VPS
4. `systemctl reload nginx`

---

## Post-Deploy Checklist

- [ ] `https://api.acme.stackium.tech/server/health` returns `{"status":"ok"}`
- [ ] `https://api.acme.stackium.tech/admin` loads the Directus login
- [ ] Admin can log in to Directus
- [ ] All collections visible in Data Model (and `applications_application_admins` deleted if present)
- [ ] Public role has Read access on all app collections
- [ ] Branding record created with org logo and colors
- [ ] All applications and connections imported (verify counts match source)
- [ ] Frontend deployed to Cloudflare Pages
- [ ] `VITE_API_URL` env var set in Pages settings
- [ ] Graph loads at the Pages URL — nodes and edges visible
- [ ] Branding applies correctly (logo, colors, title)
- [ ] Custom domain added and SSL active
- [ ] Cloudflare Access policy configured
- [ ] Test Access login flow with an org email
- [ ] Test that non-org email is blocked
- [ ] Editor accounts created and invite emails received
- [ ] Editor can add/edit an application in Directus
- [ ] Change reflects in the frontend without a redeploy
