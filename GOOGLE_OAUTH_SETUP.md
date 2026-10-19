# Step-by-Step Guide: Google OAuth 2.0 Setup for OpenAttendance

This guide walks you through creating a free **Google Cloud OAuth 2.0 Client ID** to connect OpenAttendance to personal Google Drives and Google Sheets.

> [!NOTE]
> **Total Time:** ~3 to 5 minutes.  
> **Cost:** $0.00 (Google Cloud Free Tier).  
> **No Secret Needed:** Static web apps (PWAs) only require a public **Client ID**. Never enter or expose a `client_secret`.

---

## Step 1: Create a Project in Google Cloud Console

1. Navigate to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Sign in with your standard Google Account.
3. In the top-left navigation bar, click the project dropdown and select **New Project**:
   - **Project Name:** `OpenAttendance` (or any name you prefer).
   - **Location:** Leave as *No organization* (or select your organization).
4. Click **Create** and wait a few seconds for the project to provision.
5. Make sure your new project is selected in the top dropdown.

---

## Step 2: Enable Google Sheets & Google Drive APIs

OpenAttendance requires access to the **Google Sheets API** (to append attendance logs and rollups) and the **Google Drive API** (to provision the spreadsheet file):

1. In the left navigation menu, go to **APIs & Services > Library**.
2. In the search box, type **`Google Sheets API`** and select it.
3. Click **Enable**.
4. Return to **APIs & Services > Library**.
5. Search for **`Google Drive API`** and select it.
6. Click **Enable**.

---

## Step 3: Configure the OAuth Consent Screen

Before creating credentials, Google requires basic information about the application:

1. In the left menu, click **APIs & Services > OAuth consent screen**.
2. Select **User Type:**
   - **External:** Choose this if you want anyone with a personal `@gmail.com` address to be able to use the app.
   - **Internal:** Choose this only if you are using Google Workspace and strictly want members of your company domain to sign in.
3. Click **Create**.
4. Fill in the **App Information**:
   - **App name:** `OpenAttendance`
   - **User support email:** Select your Gmail address.
   - **Developer contact information:** Enter your email address.
   - *(Optional)* App logo: You can upload `public/icon.svg`.
5. Click **Save and Continue**.
6. On the **Scopes** page:
   - Click **Add or Remove Scopes**.
   - Search for `drive.file` and select:
     `.../auth/drive.file` (*"See, edit, create, and delete only the specific Google Drive files you use with this app"*).
   - Click **Update**, then click **Save and Continue**.
   > [!TIP]
   > Why `drive.file`? This is Google's least-privilege scope. It guarantees that OpenAttendance can **never** see or read your existing Drive files—only the attendance sheet it creates itself.
7. On the **Test users** page:
   - While in "Testing" mode, add your own email address as a test user.
   - Click **Save and Continue**, then click **Back to Dashboard**.
   - *(Optional for Public Deployment)*: On the OAuth consent screen dashboard, click **Publish App** so any user can authenticate without you manually adding them as a test user.

---

## Step 4: Create OAuth 2.0 Web Client ID

1. In the left menu, click **APIs & Services > Credentials**.
2. At the top of the screen, click **+ Create Credentials** and select **OAuth client ID**.
3. In the form:
   - **Application type:** Select **Web application**.
   - **Name:** `OpenAttendance Web Client`.
4. Under **Authorized JavaScript origins**, click **+ Add URI** and add your app's URLs:
   - For Local Development:  
     `http://localhost:5174`  
     *(and `http://localhost:5173` if running on default port)*
   - For GitHub Pages:  
     `https://<your-username>.github.io`  
     *(replace `<your-username>` with your actual GitHub username)*
   - For AWS Amplify Hosting:  
     `https://main.<app-id>.amplifyapp.com`  
     *(or your custom domain, e.g., `https://attendance.yourdomain.com`)*

   > [!CAUTION]
   > **Do NOT include a trailing slash (`/`)!**  
   > Correct: `http://localhost:5174`  
   > Incorrect: `http://localhost:5174/` (Google will show an error).

5. Under **Authorized redirect URIs**:
   - Leave this **empty**! OpenAttendance uses the modern Google Identity Services (GIS) token popup flow (`initTokenClient`), which only uses JavaScript Origins.
6. Click **Create**.
7. A dialog will pop up showing:
   - **Client ID** (looks like `1234567890-abcdefghij.apps.googleusercontent.com`).
8. Copy the **Client ID**. (You do not need the Client Secret).

---

## Step 5: Add the Client ID to OpenAttendance

You can supply your Client ID in any of three convenient ways:

### Method A: Directly inside the OpenAttendance App (No code changes)
1. Open OpenAttendance in your browser ([http://localhost:5174/](http://localhost:5174/)).
2. If on the initial setup screen, paste your Client ID into the input field and click **Sign In with Google**.
3. If already in Kiosk mode:
   - Click **Admin** (unlock with PIN `1234`).
   - Go to **Drive Settings**.
   - Paste your Client ID and click **Save**.

---

### Method B: In `.env.local` (For Local Development)
Create a `.env.local` file in your repository root:
```bash
VITE_GOOGLE_CLIENT_ID=1234567890-abcdefghij.apps.googleusercontent.com
```
Vite will automatically inject this into the build.

---

### Method C: For Automated GitHub Pages Deployment
1. Go to your repository on GitHub.
2. Navigate to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret**.
   - **Name:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** `1234567890-abcdefghij.apps.googleusercontent.com`
4. Click **Add secret**.
5. When `.github/workflows/deploy.yml` runs, it will bake the Client ID into the GitHub Pages build automatically!

---

### Method D: For AWS Amplify Hosting
1. In the **AWS Amplify Console**, go to **App settings > Environment variables**.
2. Click **Manage variables** and add:
   - **Key:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** `1234567890-abcdefghij.apps.googleusercontent.com`
3. Click **Save** and trigger a redeploy. Read [AMPLIFY_SETUP.md](file:///Users/ayushpatel/Code/vibe_coded_apps/attendance_sheets_pwa/AMPLIFY_SETUP.md) for full instructions.

---

## Step 6: Verify and Auto-Provision

1. In OpenAttendance, click **Sign In with Google**.
2. A Google authentication popup will appear asking for permission to create files in your Drive (`drive.file`).
3. Click **Continue / Allow**.
4. Click **Provision Master Database**.
5. OpenAttendance will create `_OpenAttendance_Master_DB` in your Google Drive with all 5 tabs and display a direct link to your new spreadsheet!
