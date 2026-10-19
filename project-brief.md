Here is the complete **Product Requirements Document (PRD)**, **User Stories**, and **Technical Architecture** for a zero-cost, local-first, privacy-centric attendance PWA backed entirely by the user’s personal Google Drive and Google Sheets.

---

# 1. Product Requirements Document (PRD)

### 1.1 Product Vision & Value Proposition

**Working Title:** *SheetPulse* (Bring-Your-Own-Backend Attendance System)
**Core Philosophy:** **Zero Server, Zero Subscription, 100% Data Ownership.**
Traditional SaaS attendance tools charge per-seat monthly fees and store sensitive biometric, geolocation, and employee roster data on third-party servers. *SheetPulse* ships as a purely static Progressive Web App (hosted free on Cloudflare Pages, GitHub Pages, or AWS Amplify). When an organization signs in via Google OAuth, the app provisions and manages all databases, logs, and automated reports directly inside **their own Google Drive**. The app developer has zero access to user data and pays **$0.00/month** in infrastructure costs, whether serving 10 or 10,000 organizations.

### 1.2 Target Use Cases

* Small-to-medium factories, workshops, retail stores, and offices running wall-mounted Android/iPad kiosk tablets.
* Field teams checking in via mobile devices with geofencing.
* Privacy-conscious organizations that want raw, live access to their attendance data inside Google Sheets for immediate payroll integration.

### 1.3 Privacy & Security Guarantees

1. **Least-Privilege OAuth Scope:** Uses strictly `[https://www.googleapis.com/auth/drive.file](https://www.googleapis.com/auth/drive.file)`. The app can *only* view and manage the specific spreadsheet files it creates—never the user's existing Drive documents.
2. **Zero Biometric Image Storage:** For optional Face Recognition check-ins, camera streams are processed 100% locally in-browser via WebGL/WebGPU (`@vladmandic/human` or `face-api.js`). Only a mathematical 128-float vector embedding is stored in the user's sheet—never raw photos.
3. **Client-Side Field Encryption (Optional):** Sensitive columns (like Hourly Wage or National ID) can be encrypted in-browser via the **Web Crypto API (`AES-GCM`)** using a passphrase held only in the admin device's memory before writing to Google Sheets.
4. **Tamper-Evident Audit Chain:** Every attendance log row includes a `SHA-256` hash of `(previous_row_hash + current_row_payload)`. If someone manually alters a timestamp in the Google Sheet to fake overtime, the PWA immediately flags the broken cryptographic chain on the admin dashboard.

---

### 1.4 Feature Breakdown: How Feature-Full Can We Make It for $0?

By leveraging modern browser APIs and Google Sheets' native engine, we can pack enterprise-grade features with zero backend cost:

| Feature Category | Capabilities Included (100% Client-Side + Google Sheets API) |
| --- | --- |
| **Multi-Modal Check-In** | • **QR / Barcode Scanner:** Instant badge scanning via native `BarcodeDetector` API.<br>

<br>• **On-Device Face Verification:** Sub-second facial matching + liveness blink check via TensorFlow.js.<br>

<br>• **NFC Badge Tap:** Native **Web NFC API** (`NDEFReader`) on Android kiosks.<br>

<br>• **PIN + Photo Audit:** 4-digit PIN entry with optional low-res WebP snapshot saved to a Drive subfolder. |
| **Kiosk & Hardware Polish** | • **Screen Wake Lock API:** Keeps kiosk tablets awake during shift hours without touching OS settings.<br>

<br>• **Web Speech API (`speechSynthesis`):** Audible voice confirmation (*"Good morning, Rahul. Checked in at 8:58 AM"*).<br>

<br>• **Geofencing:** Haversine distance check via `navigator.geolocation` against allowed workplace coordinates. |
| **Shift & Rules Engine** | • **Multi-Shift Support:** Morning, Evening, Night (cross-midnight shifts), and Flexible hour quotas.<br>

<br>• **Grace Periods & Overtime:** Configurable late-arrival grace windows (e.g., 10 mins) and automatic OT calculation.<br>

<br>• **Break Tracking:** `BREAK_START` and `BREAK_END` actions alongside `IN` and `OUT`. |
| **Resilient Sync & Quota** | • **Offline Queue & Batching:** Stores punches in **IndexedDB** (`Dexie.js`). Flushes in batches every 15–30 seconds via `spreadsheets.values.append` to effortlessly stay under Google’s **60 writes/min per user** quota. |
| **Automated Reporting** | • **Distributed Device Scheduler:** Multi-device leader election via `_Meta` sheet leases.<br>

<br>• **Native Sheet Pivot & Charts:** Auto-generates dedicated weekly/monthly summary tabs or standalone report spreadsheets in Drive, complete with formatted headers and conditional highlighting. |
| **Lifecycle & Scale** | • **Auto-Rollover at 10M Cells:** Monitors cell count and automatically archives older logs into `Attendance_Archive_YYYY` spreadsheets when approaching Google Sheets' 10-million-cell ceiling. |

---

# 2. User Stories & Acceptance Criteria

### Epic 1: Zero-Config Onboarding & Provisioning

* **US 1.1 (Admin Onboarding):** *As an Admin, I want to click "Sign in with Google" and have the app automatically build my attendance database in my Google Drive so I don't have to configure servers or copy-paste templates.*
* **Acceptance Criteria:**
* Requests only `drive.file` scope.
* Searches Drive for `_SheetPulse_Master_DB`. If absent, executes a single `spreadsheets.create` call that builds all 5 required tabs, freezes header rows, sets column widths, and applies data validation dropdowns.




* **US 1.2 (Multi-Device Kiosk Pairing):** *As an Admin, I want to pair a wall-mounted entrance tablet to the same Google Sheet without typing credentials on a public screen.*
* **Acceptance Criteria:**
* Admin device generates a pairing QR code containing `{ spreadsheetId, kioskMode: true, pinHash }`.
* Tablet scans the QR, authenticates, locks into Kiosk Mode (requiring the Admin PIN to exit settings), and engages `navigator.wakeLock.request('screen')`.





### Epic 2: Frictionless Daily Attendance (Employee Experience)

* **US 2.1 (Fast Kiosk Check-In):** *As an Employee, I want to walk up to the tablet, scan my QR badge or face, and get immediate visual and audio confirmation in under 1.5 seconds—even if the internet is down.*
* **Acceptance Criteria:**
* Check-in writes immediately to local IndexedDB (`status: pending_sync`) and triggers UI + `speechSynthesis` feedback within 200ms.
* Background worker batches pending records and appends them to the `Attendance_Log` tab when online.




* **US 2.2 (Double-Punch Prevention):** *As an Employee, if I accidentally scan my badge twice within 3 minutes, the app should warn me instead of logging an immediate Check-Out.*
* **Acceptance Criteria:**
* Local state tracks each employee's last action and timestamp. If `< 3 minutes` have elapsed since the last punch, prompts: *"You checked in 1 minute ago. Do you really want to check out?"*





### Epic 3: Distributed Weekly Reporting & Analytics

* **US 3.1 (Leader-Elected Weekly Reports):** *As an Admin with 3 tablets and 2 laptops open, I want the weekly attendance and overtime report generated exactly once every Monday morning without duplicates.*
* **Acceptance Criteria:**
* Uses `navigator.locks` to restrict execution to one tab per physical device.
* Competing devices inspect `_Meta!B2:C3`. The first device writes a 5-minute lease (`LOCKED_<deviceId>`), computes the previous ISO week's hours/late arrivals/overtime, appends to `Weekly_Reports`, creates a clean formatted summary tab (or separate weekly Sheet file if configured), and updates `last_reported_week`.




* **US 3.2 (Tamper Detection):** *As an Admin, I want to know if someone opened the Google Sheet directly and manually edited their check-in time.*
* **Acceptance Criteria:**
* During report generation or dashboard load, the client recalculates the `SHA-256` hash chain across rows. Any mismatch highlights the specific row in red on the Admin UI.





---

# 3. System Architecture & Data Design

### 3.1 High-Level Component Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        STATIC PWA CLIENT (Browser / Kiosk)                 │
│                                                                            │
│  ┌──────────────────┐   ┌───────────────────────┐   ┌───────────────────┐  │
│  │  Check-In Engine │   │   Admin & Analytics   │   │ Hardware Bridges  │  │
│  │  - QR (ZXing)    │   │   - Roster Manager    │   │ - Web Locks API   │  │
│  │  - Face (TF.js)  │   │   - Shift Config      │   │ - WakeLock API    │  │
│  │  - PIN / NFC     │   │   - Hash Chain Verif. │   │ - SpeechSynthesis │  │
│  └────────┬─────────┘   └───────────┬───────────┘   └─────────┬─────────┘  │
│           │                         │                         │            │
│           ▼                         ▼                         ▼            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Local Storage Layer (Dexie.js / IndexedDB)        │  │
│  │  • `employees_cache` (TTL synced)     • `outbox_queue` (Offline logs)│  │
│  │  • `face_descriptors` (Float32Arrays) • `app_config` (Shift rules)   │  │
│  └──────────────┬───────────────────────────────────────┬───────────────┘  │
│                 │                                       │                  │
│                 ▼                                       ▼                  │
│  ┌─────────────────────────────────┐     ┌──────────────────────────────┐  │
│  │   Batch Sync Engine             │     │  Distributed Cron / Leader   │  │
│  │   - Flushes outbox every 20s    │     │  - Checks `_Meta` lease      │  │
│  │   - Exponential backoff on 429  │     │  - Computes Weekly Reports   │  │
│  └──────────────┬──────────────────┘     └──────────────┬───────────────┘  │
└─────────────────┼───────────────────────────────────────┼──────────────────┘
                  │ HTTPS REST (Bearer Token)             │
                  ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   USER'S PERSONAL GOOGLE DRIVE & SHEETS API v4             │
│                                                                            │
│  📄 Master Spreadsheet: `_SheetPulse_Master_DB`                            │
│     ├── Tab 1: `_Meta` (Distributed Mutex Lock, Schema Version, Checkpoints)│
│     ├── Tab 2: `Employees` (ID, Name, Role, Shift_ID, PIN_Hash, Face_Vec)  │
│     ├── Tab 3: `Shifts` (Shift_ID, Start, End, Grace_Mins, OT_Multiplier)  │
│     ├── Tab 4: `Attendance_Log` (Append-only logs + SHA-256 chain hash)    │
│     └── Tab 5: `Weekly_Reports` (Aggregated metrics per employee per week) │
│                                                                            │
│  📁 Folder: `SheetPulse_Weekly_Exports/` (Optional standalone weekly files)│
└────────────────────────────────────────────────────────────────────────────┘

```

---

### 3.2 Google Sheets Database Schema (`_SheetPulse_Master_DB`)

#### 1. `_Meta` (System State & Distributed Lock Coordinator)

| Key (Col A) | Value (Col B) | Updated_At (Col C) | Notes (Col D) |
| --- | --- | --- | --- |
| `schema_version` | `1.0.0` | `2026-10-19T00:00:00Z` | Auto-migrations check this |
| `last_reported_week` | `2026-W41` | `2026-10-12T06:00:12Z` | ISO Week checkpoint |
| `report_lock` | `IDLE` | `2026-10-12T06:00:12Z` | `IDLE` or `LOCKED_<deviceId>` |
| `last_row_hash` | `e3b0c44298fc...` | `2026-10-18T18:05:00Z` | Genesis/tip hash for tamper detection |

#### 2. `Employees` (Roster & Biometric Vectors)

| emp_id | full_name | department | shift_id | status | pin_hash | face_descriptor_json | hourly_rate_enc |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EMP-01` | Aravind Kumar | Production | `SH-MORN` | `ACTIVE` | `8d969eef...` | `[0.021, -0.114, ...]` | `ENC:iv:ciphertext` |

#### 3. `Shifts` (Shift Rules)

| shift_id | name | start_time | end_time | grace_mins | min_full_day_hrs | working_days |
| --- | --- | --- | --- | --- | --- | --- |
| `SH-MORN` | Morning Shift | `09:00` | `18:00` | `10` | `8.0` | `MON,TUE,WED,THU,FRI,SAT` |
| `SH-NIGHT` | Night Shift | `22:00` | `06:00` | `15` | `7.5` | `MON,TUE,WED,THU,FRI` |

#### 4. `Attendance_Log` (Append-Only Event Stream)

| log_id | iso_timestamp | local_date | emp_id | action | device_id | method | geo_lat_lng | late_mins | prev_hash_sig |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `uuid-1` | `2026-10-19T03:32:10Z` | `2026-10-19` | `EMP-01` | `IN` | `Kiosk-Gate1` | `FACE` | `22.7196,75.8577` | `2` | `9f86d081884c...` |

#### 5. `Weekly_Reports` (Rollup Table)

| iso_week | date_range | emp_id | full_name | days_present | days_absent | total_regular_hrs | overtime_hrs | late_count | missing_out_punches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-W41` | `Oct 05 - Oct 11` | `EMP-01` | Aravind Kumar | `6` | `0` | `48.0` | `4.5` | `1` | `0` |

---

### 3.3 Solving the "Hard Edges" of a Pure-Client Google Sheets App

To make this production-grade and reliable when running open on devices all day, the architecture must solve four specific edge cases:

#### 1. Silent OAuth Token Renewal (The 60-Minute Expiry Problem)

Google Identity Services (GIS) access tokens expire after **3,600 seconds (1 hour)**. If a kiosk tablet sits open for 10 hours, API calls will start returning `401 Unauthorized` after hour one.

* **Solution:**
1. Never block check-ins on a valid token! Check-ins always write straight to **IndexedDB (`outbox_queue`)** first.
2. Track `token_expires_at` in memory. At minute 50, call `tokenClient.requestAccessToken({ prompt: 'none', hint: userEmail })` to silently refresh the token if the browser session permits.
3. If the browser blocks background popups (requiring a user gesture), set an internal flag `needsTokenRefresh = true`. The moment the *next* employee taps the screen to check in, use that physical tap gesture to trigger `tokenClient.requestAccessToken({ prompt: '' })` in the background, or show a single "Tap to Reconnect Sync" banner while continuing to store all punches safely in IndexedDB.



#### 2. Defeating the 60 Writes/Min Quota Ceiling (Write Batching)

If 80 workers line up at 9:00 AM and scan their badges within 60 seconds, firing 80 individual `append` requests will trigger `HTTP 429: RESOURCE_EXHAUSTED` (since Google limits each user to 60 writes/min).

* **Solution:** The **Batch Sync Engine**.
* Every check-in inserts a record into IndexedDB `outbox_queue`.
* A background loop runs **once every 20 seconds**.
* If `outbox_queue` has 25 pending check-ins, it bundles all 25 rows into a **single** `POST /v4/spreadsheets/{id}/values/Attendance_Log!A:J:append` call (`values: [row1, row2, ..., row25]`).
* **Result:** 80 workers checking in over 1 minute consumes only **3 API write calls** instead of 80.



#### 3. Standalone Weekly Report Spreadsheets + Visual Formatting

Since you stated *"and reports also as sheets"*, the leader device can do both:

1. Append summary rows to the `Weekly_Reports` tab inside the master workbook.
2. Call `spreadsheets.create` via the Sheets API to spin up a brand-new standalone Google Sheet inside a `Weekly Attendance Reports/` Drive folder named **`Attendance_Report_2026-W41`** (or add a dedicated tab `Report_2026-W41`) with:
* Conditional formatting rules (highlighting `late_count > 2` in light red, or `missing_out_punches > 0` in yellow) via `spreadsheets.batchUpdate`.
* Pre-built `=SUM()` and `=AVERAGE()` footer rows so it can be shared directly with accounting or printed immediately.



#### 4. Handling "Forgot to Check Out" & Night Shifts

In real-world attendance, someone always forgets to punch `OUT`.

* **Pairing Algorithm in Report Engine:**
* Instead of naively counting `IN`s and `OUT`s, the client-side report compiler sorts an employee's punches chronologically.
* It pairs each `IN` with the next `OUT` within a 16-hour window (allowing Night Shifts that start at `22:00` on Monday and end at `06:00` on Tuesday to resolve cleanly to Monday's shift).
* If an `IN` is followed by another `IN` the next morning without an intervening `OUT`, the engine flags `missing_out_punches += 1` and applies a configurable fallback (e.g., credit standard shift hours or flag `0` for admin review).



---

### 3.4 Recommended Tech Stack & Cost Breakdown

| Layer | Technology Choice | Monthly Cost |
| --- | --- | --- |
| **Frontend Framework** | **Vue 3** (or React) + **TypeScript** + **Vite** + **TailwindCSS** | **$0** (Open Source) |
| **PWA & Offline Engine** | `vite-plugin-pwa` (Workbox) + **Dexie.js** (IndexedDB wrapper) | **$0** (Open Source) |
| **Client-Side Biometrics / QR** | `@vladmandic/human` (WebGL Face ID) + `@zxing/browser` (QR) | **$0** (Runs on device GPU/CPU) |
| **Hosting / CDN** | **Cloudflare Pages** / **GitHub Pages** / **AWS Amplify Static** | **$0** (Free static tier) |
| **Database & Storage** | **User's Google Drive & Sheets API v4** (300 req/min project limit) | **$0** (Included in personal Google account) |
| **Total Operating Cost** | **Full Enterprise Attendance & Reporting System** | **$0.00 / month** |