# Step-by-Step Guide: Deploying OpenAttendance to AWS Amplify

This guide walks you through deploying OpenAttendance as a static Progressive Web App (PWA) on **AWS Amplify Hosting**, setting up the `VITE_GOOGLE_CLIENT_ID` environment variable, and authorizing your Amplify domain with Google OAuth.

> [!NOTE]
> **Total Time:** ~3 to 5 minutes.  
> **Cost:** $0.00 (AWS Free Tier includes 1,000 build minutes/month and 15 GB served/month).  
> **Continuous Deployment:** Every git push to your `main` branch automatically triggers a new deployment.

---

## Step 1: Connect Your GitHub Repository in AWS Amplify

1. Log into the **[AWS Management Console](https://console.aws.amazon.com/)**.
2. In the top search bar, type **Amplify** and select **AWS Amplify**.
3. Click **Create new app** (or **Host web app**).
4. Select **GitHub** as your Git provider and click **Next**.
5. Authorize AWS Amplify to access your GitHub account.
6. Under **Recently updated repositories**, select:
   - **Repository:** `ayushpatel1001/OpenAttendance`
   - **Branch:** `main`
7. Click **Next**.

---

## Step 2: Build Settings (Auto-Detected from `amplify.yml`)

Amplify will automatically detect the [amplify.yml](file:///Users/ayushpatel/Code/vibe_coded_apps/attendance_sheets_pwa/amplify.yml) file included in the repository:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

> [!TIP]
> You do **not** need to manually configure the build commands. Amplify reads `amplify.yml` automatically.

---

## Step 3: Configure Environment Variables in AWS Amplify

Vite reads environment variables starting with `VITE_` during build time.

### In the Setup Wizard (Before Initial Deploy):
1. In the **App settings** step, expand **Advanced settings**.
2. Under **Environment variables**, click **Add variable**:
   - **Key:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** `1234567890-abcdefghij.apps.googleusercontent.com` *(your Google OAuth Client ID)*
3. Click **Next**, then click **Save and deploy**.

### In an Existing Amplify App:
1. Open your app in the AWS Amplify Console.
2. In the left navigation menu, go to **App settings > Environment variables**.
3. Click **Manage variables**.
4. Click **Add variable**:
   - **Key:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** `1234567890-abcdefghij.apps.googleusercontent.com`
5. Click **Save**.
6. Trigger a redeploy: go to your `main` branch and click **Redeploy this version**.

---

## Step 4: Configure Single Page App (SPA) Rewrites

To ensure direct links, reloads, and PWA routing work without 404 errors:

1. In the left navigation menu of AWS Amplify, click **Rewrites and redirects**.
2. Verify or add the standard Single Page Application rewrite rule:
   - **Source address:** `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|webmanifest)$)([^.]+$)/>`
   - **Target address:** `/index.html`
   - **Type:** `200 (Rewrite)`
3. Click **Save**.

---

## Step 5: Add Your Amplify URL to Google Cloud Console

Once deployed, AWS Amplify provides you with a default URL (e.g., `https://main.d1a2b3c4d5e6f7.amplifyapp.com` or your custom domain). 

You must whitelist this domain in Google Cloud Console so users can authenticate:

1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Navigate to **APIs & Services > Credentials**.
3. Click on your OAuth 2.0 Client ID (**OpenAttendance Web Client**).
4. Under **Authorized JavaScript origins**, click **+ Add URI**:
   - Enter your Amplify URL:  
     `https://main.<app-id>.amplifyapp.com`  
     *(or your custom domain, e.g., `https://attendance.yourdomain.com`)*

   > [!CAUTION]
   > **Do NOT include a trailing slash!**  
   > Correct: `https://main.d1234567890.amplifyapp.com`  
   > Incorrect: `https://main.d1234567890.amplifyapp.com/`

5. Under **Authorized redirect URIs**: Leave empty (OpenAttendance uses Google Identity Services popup tokens).
6. Click **Save**.

---

## Step 6: Verify Deployment & PWA Installation

1. Open your Amplify URL in any browser.
2. You will see the **OpenAttendance Setup Wizard**.
3. Click **Sign In with Google** — Google will prompt you to authorize file access for your personal Google Drive (`drive.file`).
4. Click **Provision Master Database** to create `_OpenAttendance_Master_DB`.
5. On supported browsers (Chrome, Edge, Android), click the **Install App** button in the top header to install OpenAttendance as a standalone PWA on your home screen or desktop!
