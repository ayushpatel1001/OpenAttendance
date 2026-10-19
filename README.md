# SheetPulse • Financial Times Executive Biometric Ledger

> **Zero Server. Zero Subscription. 100% Data Ownership.**  
> A privacy-centric, local-first Progressive Web App (PWA) backed entirely by the user's personal Google Drive and Google Sheets, featuring on-device Face ID biometric verification styled with Financial Times editorial elegance.

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline%20First-BA0000.svg)](https://w3c.github.io/manifest/)
[![License: MIT](https://img.shields.io/badge/License-MIT-0F5499.svg)](LICENSE)
[![Operating Cost](https://img.shields.io/badge/Monthly%20Cost-%240.00%2Fmo-007F3B.svg)](#zero-cost-architecture)
[![Biometrics](https://img.shields.io/badge/Biometrics-128--Float%20Vector%20Only-990F3D.svg)](#face-id--privacy-guarantees)

---

## 1. Executive Summary & Value Proposition

Traditional SaaS attendance tools charge steep per-seat monthly subscriptions ($3–$10/employee/month) and store sensitive biometric portraits and employee data on third-party servers.

**SheetPulse** eliminates servers entirely:
- **Zero Infrastructure Cost ($0.00/month):** Hosted as a purely static Progressive Web App (Cloudflare Pages, GitHub Pages, or Vercel).
- **100% Data Sovereignty:** Attendance databases, rosters, and weekly payroll rollups reside directly inside **your own Google Drive**.
- **On-Device Face ID:** Camera feeds are processed in-browser. Only mathematical **128-float vector embeddings** are stored in Google Sheets—never raw photos.
- **Tamper-Evident SHA-256 Audit Chain:** Every attendance punch cryptographically seals the previous row's hash. Manual alterations inside Google Sheets immediately trigger visible integrity alarms.
- **Write-Batching Outbox Engine:** Defeats Google Sheets' 60 writes/minute quota ceiling by bundling check-ins in local IndexedDB and flushing in 20-second intervals.
- **Financial Times Editorial Design:** Distinctive warm newsprint palette (`#FFF1E5`), classic editorial serif typography, live market-style attendance ticker, and brass/claret biometric reticle HUD.

---

## 2. Visual Aesthetic & Editorial Experience

Designed under high-end **Financial Times** aesthetic principles:
- **Palette:** Signature newsprint paper background (`#FFF1E5`), FT Claret (`#990F3D`), Oxford Navy (`#0F5499`), Financial Green (`#007F3B`), and crisp hairline borders (`#141414`).
- **Typography:** Classic editorial serif headlines (*Newsreader* / *Cinzel* / *Georgia*) paired with high-legibility sans-serif (*Plus Jakarta Sans*) and tabular monospaced numbers (*JetBrains Mono*).
- **Masthead & Market Ticker:** Top dateline with global exchange markers (London, New York, Tokyo, Singapore), dynamic presence ratios (`PRESENT: 94.2% ▲`), outbox sync queue counters, and cryptographic chain status.
- **Biometric HUD:** Kiosk reticle with corner brackets, scanning laser beam, live optical illumination meters, liveness/anti-spoofing verification, and audio/voice confirmation.

---

## 3. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STATIC PWA CLIENT (Browser / Tablet Kiosk)           │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐  ┌──────────────────┐ │
│   │   Face ID Engine   │   │  Audit Chain Log  │  │ Hardware Bridges │ │
│   │   • 128-D Vectors  │   │  • SHA-256 Tip    │  │ • Wake Lock API  │ │
│   │   • Anti-Spoofing  │   │  • Tamper Detect  │  │ • Web Audio Bell │ │
│   │   • Double-Punch   │   │  • Punctuality    │  │ • SpeechSynthesis│ │
│   └─────────┬──────────┘   └─────────┬─────────┘  └────────┬─────────┘ │
│             │                        │                     │           │
│             ▼                        ▼                     ▼           │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │              Local IndexedDB Layer (Dexie.js Offline)            │ │
│   │   • employees (128-d vectors)   • shifts (grace rules)           │ │
│   │   • attendance_logs             • outbox_queue (pending sync)    │ │
│   │   • meta (system leases & cryptographic tip)                     │ │
│   └──────────────────────────────────┬───────────────────────────────┘ │
│                                      │                                 │
│                                      ▼                                 │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │       Write-Batch Sync Engine (Flushes every 20s or on demand)    │ │
│   │       Bundles N logs into 1 POST spreadsheets.values.append       │ │
│   └──────────────────────────────────┬───────────────────────────────┘ │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ HTTPS REST (drive.file scope)
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│            USER'S PERSONAL GOOGLE DRIVE & GOOGLE SHEETS API v4         │
│                                                                        │
│   📄 Master Spreadsheet: `_SheetPulse_Master_DB`                       │
│      ├── Tab 1: `_Meta` (Distributed Mutex Lock & Schema Version)      │
│      ├── Tab 2: `Employees` (Roster & 128-Float Biometric Vectors)     │
│      ├── Tab 3: `Shifts` (Hours, Grace Periods, Overtime Quotas)       │
│      ├── Tab 4: `Attendance_Log` (Append-Only Event Stream + SHA-256)   │
│      └── Tab 5: `Weekly_Reports` (Aggregated Rollup per Employee/Week) │
│                                                                        │
│   📁 Standalone Weekly Reports: `SheetPulse_Weekly_Report_2026-Wxx`     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Google Sheets Database Schema

The app provisions `_SheetPulse_Master_DB` automatically with 5 synchronized tabs:

### 1. `_Meta` (Distributed Lock & System Anchor)
| Key (Col A) | Value (Col B) | Updated_At (Col C) | Notes (Col D) |
| :--- | :--- | :--- | :--- |
| `schema_version` | `1.0.0` | `2026-10-19T00:00:00Z` | Schema migration check |
| `last_reported_week` | `2026-W42` | `2026-10-19T06:00:00Z` | ISO week checkpoint |
| `report_lock` | `IDLE` | `2026-10-19T06:00:00Z` | Distributed mutex lock lease |
| `last_row_hash` | `e3b0c44298fc...` | `2026-10-19T09:00:00Z` | Cryptographic chain anchor |

### 2. `Employees` (Roster & Biometrics)
| emp_id | full_name | department | shift_id | status | pin_hash | face_descriptor_json | hourly_rate_enc | role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `EMP-01` | Aravind Kumar | Quantitative Analytics | `SH-MORN` | `ACTIVE` | `8d969...` | `[-0.081, 0.124, ...]` | `68.50` | Lead Engineer |

### 3. `Shifts` (Policies & Grace Periods)
| shift_id | name | start_time | end_time | grace_mins | min_full_day_hrs | working_days |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SH-MORN` | Morning Shift | `09:00` | `18:00` | `10` | `8.0` | `MON,TUE,WED,THU,FRI,SAT` |
| `SH-NIGHT` | Night Shift | `22:00` | `06:00` | `15` | `7.5` | `MON,TUE,WED,THU,FRI` |

### 4. `Attendance_Log` (Append-Only Event Stream)
| log_id | iso_timestamp | local_date | emp_id | action | device_id | method | geo_lat_lng | late_mins | prev_hash_sig |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `punch-1792...` | `2026-10-19T09:02:14Z` | `2026-10-19` | `EMP-01` | `IN` | `Kiosk-London-Desk01` | `FACE` | `51.5074,-0.1278` | `2` | `7d1a49f8...` |

### 5. `Weekly_Reports` (Rollup Table)
| iso_week | date_range | emp_id | full_name | days_present | days_absent | total_regular_hrs | overtime_hrs | late_count | missing_out_punches |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-W42` | `Oct 12 - Oct 18` | `EMP-01` | Aravind Kumar | `5` | `0` | `40.0` | `3.5` | `1` | `0` |

---

## 5. Technical Highlights & Edge Case Solutions

### 5.1 On-Device Face ID & Privacy Guarantees
- **Zero Raw Photos Saved:** Camera frames are streamed to an off-screen canvas and immediately converted into a normalized 128-float unit vector $\vec{v}$ ($\|\vec{v}\| = 1.0$).
- **Cosine Distance Matching:**
  $$\text{similarity} = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
  Threshold $\ge 0.84$ triggers instant recognition in under 300ms.
- **Anti-Spoofing & Liveness Test:** Frame-to-frame pixel micro-variance checks detect natural head micro-motion, preventing printed photo spoofing.
- **Interactive 3-Step Enrollment:** Captures 3 rapid optical frames from the webcam, averages them to create a centroid embedding, and registers the employee immediately.

### 5.2 Defeating the 60 Writes/Minute Quota Ceiling
Google Sheets API v4 limits user write operations to 60 requests/minute. If 50 factory workers punch in within 60 seconds, individual append calls would trigger `HTTP 429: RESOURCE_EXHAUSTED`.
- **Batch Outbox Solution:** Every punch writes immediately to local IndexedDB (`outbox_queue`).
- A background worker polls every 20 seconds. If 30 punches are queued, it bundles them into a **single** `POST /v4/spreadsheets/{id}/values/Attendance_Log!A:J:append` call (`values: [row1, row2, ..., row30]`).
- **Result:** 100 check-ins consume only 2–4 Google API calls instead of 100.

### 5.3 Tamper-Evident Cryptographic SHA-256 Audit Chain
Every row is cryptographically chained:
$$\text{sig}_n = \text{SHA-256}(\text{sig}_{n-1} \,\|\, \text{log\_id} \,\|\, \text{emp\_id} \,\|\, \text{iso\_timestamp} \,\|\, \text{action} \,\|\, \text{late\_mins})$$
If an administrator or worker opens Google Sheets and edits an arrival timestamp to claim unearned overtime, the audit engine flags the broken link in red on the admin dashboard, pointing to the exact row and expected signature.

### 5.4 Double-Punch Prevention (< 3 Minutes Guard)
If an employee scans their face twice within 180 seconds, a modal dialog appears:
*"You checked in 1m 12s ago. Did you intend to record an immediate Check-Out, or cancel?"*

### 5.5 16-Hour Pairing Algorithm for Night Shifts
The reporting compiler sorts punches chronologically and pairs each `IN` with the next `OUT` within a **16-hour window**. This seamlessly handles shifts that start at `22:00` on Monday and conclude at `06:00` on Tuesday without incorrectly fragmenting work days.

---

## 6. Getting Started

### 6.1 Prerequisites
- Node.js 18+ and npm 9+
- A Google Account (free personal or Google Workspace)

### 6.2 Installation & Local Development
```bash
# Clone the repository
git clone https://github.com/your-username/attendance_sheets_pwa.git
cd attendance_sheets_pwa

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:5174/](http://localhost:5174/) in your browser.

### 6.3 Building for Production
```bash
npm run build
npm run preview
```
This generates an optimized static PWA bundle inside `dist/` with auto-updating Service Workers (`dist/sw.js`) and Web Manifest (`dist/manifest.webmanifest`).

---

## 7. Connecting Your Google Drive (Optional)

SheetPulse functions out of the box in **Local Offline Mode** with realistic pre-seeded data. To connect your live Google Drive:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named `SheetPulse Attendance`.
3. Enable the **Google Sheets API** and **Google Drive API**.
4. Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application Type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5174` (and your production domain)
5. Copy your **Client ID** (e.g. `1234567890-abcdefgh.apps.googleusercontent.com`).
6. In SheetPulse, open the **Google Drive Sync** tab, paste your Client ID, and click **Save Client ID**.
7. Click **Sign In with Google** and then **Auto-Provision Drive Sheet**. SheetPulse creates `_SheetPulse_Master_DB` directly in your personal Drive!

---

## 8. Deployment (Zero Cost)

Because SheetPulse is a purely static PWA with client-side biometrics, it can be deployed for **$0.00/month** to any static host:

- **Cloudflare Pages:** Connect repository, build command `npm run build`, output directory `dist`.
- **Vercel:** Framework Preset: `Vite`, output directory: `dist`.
- **GitHub Pages:** Deploy `dist/` branch via GitHub Actions.

---

## 9. License

Released under the **MIT License**. Free for commercial and non-commercial enterprise use.
