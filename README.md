# SheetPulse • Open-Source Biometric Attendance PWA

> **Zero Server. Zero Subscription. 100% Free & Open Source for anyone with a Google Account.**  
> A simple, privacy-centric, local-first Progressive Web App (PWA) backed entirely by the user's personal Google Drive and Google Sheets, featuring on-device Face ID.

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline%20First-2563EB.svg)](https://w3c.github.io/manifest/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981.svg)](LICENSE)
[![Operating Cost](https://img.shields.io/badge/Monthly%20Cost-%240.00%2Fmo-059669.svg)](#why-zero-cost)
[![Biometrics](https://img.shields.io/badge/Biometrics-128--Float%20Vectors%20Only-111827.svg)](#privacy-guarantees)

---

## 1. Overview & Value Proposition

Traditional attendance and time-tracking software charges per-seat monthly subscription fees ($3–$10/user/month) and stores sensitive employee biometric pictures on third-party servers.

**SheetPulse** is a lightweight, zero-backend, client-side Progressive Web App (PWA) built for organizations, workshops, retail stores, and teams of all sizes:
- **Zero Server Costs ($0.00/month):** Runs completely in the browser and deploys free on GitHub Pages, Cloudflare Pages, or Vercel.
- **100% Data Sovereignty:** When a user signs in with Google, all databases, rosters, and weekly payroll rollups are created and stored inside **their own Google Drive**.
- **On-Device Face ID:** Camera frames are converted in real time into normalized **128-float mathematical embedding vectors**. Zero raw images or video streams are ever stored or sent over the network.
- **Mobile Kiosk Mode & PIN Lock:** On tablets and mobile phones, admin settings and rosters are hidden behind a 4-digit PIN (default: `1234`), providing a dedicated, tamper-proof check-in screen for employees.
- **Tamper-Evident SHA-256 Audit Chain:** Every punch mathematically seals the previous record's hash signature. If someone manually alters a timestamp in Google Sheets, the app instantly flags the broken chain.
- **Write-Batching Sync Engine:** Defeats Google’s 60 writes/minute quota ceiling by queueing check-ins in local IndexedDB and flushing in 20-second batches.

---

## 2. Deploying on GitHub Pages & Google Credentials FAQ

### Q: Should I add my own Google credentials for demo and usage?

**Yes! Here is how it works and why it is safe:**

1. **Google OAuth Client IDs are Public by Design:**  
   In a frontend Single Page App (SPA), the Google OAuth **Client ID** (e.g. `1234567890-abcdefgh.apps.googleusercontent.com`) is a public identifier. It is **not** a secret. You never use or expose a `client_secret`.

2. **Domain Origin Restriction:**  
   In Google Cloud Console, your Client ID is locked to specific **Authorized JavaScript origins** (e.g., `https://<your-username>.github.io` and `http://localhost:5174`). Other domains cannot use your Client ID.

3. **Users Own Their Data:**  
   When visitors on your GitHub Pages site click **"Sign In with Google"**, they authenticate with *their own* Google account. Because SheetPulse uses the least-privilege `https://www.googleapis.com/auth/drive.file` scope:
   - The app **only** accesses the specific spreadsheets it creates inside that visitor's personal Google Drive.
   - It cannot read their personal Drive files, and it does not write to your Drive.

4. **Recommended Setup for GitHub Pages:**
   - Add your Google Client ID as an environment variable `VITE_GOOGLE_CLIENT_ID` in your repository secrets or `.env.production` file.
   - When visitors open your deployed app, the Client ID is automatically pre-filled, giving them an instant 1-click **"Sign In with Google"** and **"Auto-Provision Sheets"** onboarding experience!
   - SheetPulse also allows any user to paste their own Client ID in **Drive Settings** if they choose to self-host.

---

## 3. Step-by-Step Google Cloud Console Setup

To generate a Google Client ID for your GitHub Pages deployment:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `SheetPulse Attendance`).
3. Enable the **Google Sheets API** and **Google Drive API**:
   - Go to **APIs & Services > Library**.
   - Search for **Google Sheets API** and click **Enable**.
   - Search for **Google Drive API** and click **Enable**.
4. Configure the **OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `SheetPulse Attendance`.
   - Developer Contact Email: Your email.
   - Scopes: Add `https://www.googleapis.com/auth/drive.file`.
5. Create OAuth Credentials:
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `SheetPulse Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5174` (for local development)
     - `https://<your-username>.github.io` (for GitHub Pages)
6. Copy your **Client ID**.

---

## 4. Google Sheets Database Schema

SheetPulse automatically provisions `_SheetPulse_Master_DB` with 5 synchronized tabs:

1. **`_Meta`**: System state, distributed lease lock, schema version, and cryptographic chain tip.
2. **`Employees`**: Roster, department, role, shift ID, and 128-float biometric vectors.
3. **`Shifts`**: Scheduled work hours, grace periods, and full-day targets.
4. **`Attendance_Log`**: Append-only event stream with SHA-256 chain signatures.
5. **`Weekly_Reports`**: Aggregated weekly rollups (regular hours, overtime, late counts, missing punches).

---

## 5. Mobile Kiosk Mode & Admin Security PIN

- **Public Kiosk Mode:** By default, all administrative tabs (Ledger, Personnel Roster, Shifts, Reports, Drive Settings) are hidden from view.
- **Admin Authentication:** Tapping the **Admin** button in the header opens a touch-friendly numeric keypad.
- **Default PIN:** `1234` (can be changed anytime in Settings).
- **Lock Kiosk:** Tapping **Lock Kiosk** immediately re-locks the terminal back to the clean public Face ID scanner.

---

## 6. Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/attendance_sheets_pwa.git
cd attendance_sheets_pwa

# Install dependencies
npm install

# (Optional) Add your Client ID to .env
echo "VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com" > .env.local

# Start development server
npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/) in your browser.

---

## 7. Deploying to GitHub Pages

### Option A: Automated GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy SheetPulse to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build with Client ID
        run: npm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

1. Push your code to GitHub.
2. In your GitHub repository, go to **Settings > Pages > Build and deployment > Source** and select **GitHub Actions**.
3. (Optional) Go to **Settings > Secrets and variables > Actions** and add `VITE_GOOGLE_CLIENT_ID` with your Google Client ID.

---

## 8. License

Released under the **MIT License**. Free for personal, commercial, and open-source use.
