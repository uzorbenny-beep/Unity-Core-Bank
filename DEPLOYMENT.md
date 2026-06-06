# UnityCore Web Deployment & Installation Master Guide
*(Tailored for deploying **unitycorebk.com** via cPanel with Firebase Integration)*

This master guide provides a simplified, step-by-step walkthrough to get your website fully live on your custom domain, **unitycorebk.com**, using standard **cPanel Shared Hosting**. It also details how to run the source code locally, obtain your project files from AI Studio, and configure the Firebase backend.

---

## 📋 Comprehensive Checklist
1. [ ] **Retrieve Project Files & Build**: Get the project ZIP/dist from Google AI Studio.
2. [ ] **Set Up Firebase (Backend)**: Create a Firebase instance for authentication and live security logs.
3. [ ] **Upload Website via cPanel**: Place compiled client assets inside the `public_html` directory of your cPanel account.
4. [ ] **Route Configuration**: Set up the `.htaccess` file to lock in client-side navigation.

---

## 🌟 ZERO-SETUP OPTION: Connect Your Live Firebase Instantly (Highly Recommended)

If compiling code locally with PowerShell or uploading files to cPanel is too stressful or complicated, **you don't have to do any of it to make the app work with your real database!**

We have built a custom **Developer settings portal** directly into the running web interface on your live Google AI Studio preview links:
- **Development App Link**: `https://ais-dev-ylwcqbag4kltu3zr2ajlwq-205338336423.europe-west2.run.app`
- **Shared App Link**: `https://ais-pre-ylwcqbag4kltu3zr2ajlwq-205338336423.europe-west2.run.app`

### How to use it in 3 Simple Steps:
1. **Open the live application link** above in your mobile phone or computer web browser.
2. In the bottom-right corner of the screen, click on the flashing blue button labeled **`⚙️ Change Database`**.
3. A sleek popup window will appear. Select **"Paste Code Snippet"** or **"Manual Form Entry"**:
   - Simply copy and paste your Firebase Web Configuration snippet (the code block you shared containing `apiKey`, `projectId`, etc.) directly into the text box.
   - Click **`🛠️ Connect & Restart App`**.
4. **That's it!** The live preview link will instantly reload, disconnect from our sandbox, and connect directly to **your real private Firestore database and your custom project!**
   - You can share your preview link with partners, and their actions will save directly to *your* real live database.
   - If you ever want to revert back, simply click the button again and choose **"Reset to Sandbox Demo"**.

---

## ⚡ 100% RELIABLE DOMAIN OPTION: Run unitycorebk.com on Firebase (Bypassing cPanel Entirely!)

If you do not want to deal with cPanel, zipping, file managers, or Apache errors, **you can host the entire app directly on Firebase Hosting for free!** It connects to your custom domain **`unitycorebk.com`**, provides a free SSL certificate, and deploys instantly via your terminal.

### Step-by-Step setup list:

### 1. Link unitycorebk.com inside Firebase Console
1. Go to your [Firebase Console](https://console.firebase.google.com/) and open your project.
2. In the left-hand navigation sidebar, look under **Build** (or search) and click **Hosting**.
3. Click the blue **"Get Started"** button if it is your first time, or click **"Add Custom Domain"**.
4. Type in your domain name: **`unitycorebk.com`** and click **Continue**.
5. Firebase will show you **two DNS IP addresses** (A Records) that you need to add to your domain settings, resembling:
   - Type: `A`, Hostname: `@`, Value: `199.36.158.100` (Example IP)
   - Type: `A`, Hostname: `@`, Value: `199.36.158.100` (Example IP)

### 2. Update your Domain's DNS Records (Where you bought your domain)
1. Log in to the website where you bought your domain (e.g. Namecheap, GoDaddy, Hostinger, etc.).
   - *If your domain DNS is managed in cPanel, search for **Zone Editor** inside your cPanel main page.*
2. Go to your **DNS Settings** (or **Zone File**, or **DNS Manager**).
3. Add or modify the **A Records** for your domain `@` (which represents `unitycorebk.com` without prefixes):
   - Change the A record value to point to the first Firebase IP address.
   - Add a second A record pointing to the second Firebase IP address.
4. If you see dynamic TXT records required for verification, copy and add them as TXT records in the same DNS Manager.
*(Once saved, your domain now talks directly with Firebase Cloud Services. Firebase will automatically request a free SSL padlock certificate for `https://unitycorebk.com`.)*

### 3. Deploy in 5 Seconds using your Computer (Command Prompt)

Your errors are happening for two very simple reasons:
1. **"Missing script: deploy"**: You are running commands inside the older folder you downloaded previously. We *just* created the `"deploy"` script and the `firebase.json` configuration files inside your workspace right now. You need to **download a fresh ZIP from AI Studio first!**
2. **"could not determine executable to run"**: Sometimes the `npx` helper utility gets confused on Windows. The bulletproof solution is to install the Firebase command line utility globally onto your computer, allowing you to run `firebase` directly!

Here is the exact step-by-step to get this up and running inside your Windows **Command Prompt** (not PowerShell, so you can bypass security policies completely):

---

#### 📦 Phase A: Get the Latest Updated Files
To download the updated project files containing all your firebase deployment settings:
1. At the top-right corner of the Google AI Studio screen, click the **Settings** or **Export** icon.
2. Select **Export to ZIP** (or download the files) to get a fresh copy of your code.
3. Extract this new zip file to your folder (for example: `C:\Users\HP\Downloads\unitycore-bank-updated`).

---

#### 🛠️ Phase B: Install & Deploy in Command Prompt (CMD)

1. Open your Windows Start menu, type **`cmd`**, and launch **Command Prompt**.
2. Point Command Prompt to your newly extracted folder by typing:
   ```cmd
   cd "C:\Users\HP\Downloads\unitycore-bank-updated"
   ```
   *(Press **Enter**)*
3. **Install Firebase Utilities Globally (Fixes the dynamic resolver bug)**:
   ```cmd
   npm install -g firebase-tools
   ```
   *(Press **Enter** and wait 20 seconds for the installation to finish).*
4. **Log in to Firebase**:
   ```cmd
   firebase login
   ```
   *(A web page will pop up automatically. Sign in with your Google Account that holds your active project `ai-studio-applet-webapp-797cd`).*
5. **Attach to your Project ID**:
   ```cmd
   firebase use ai-studio-applet-webapp-797cd
   ```
6. **Install Local Project Dependencies (Fixes your "Vite not recognized" error!)**:
   ```cmd
   npm install
   ```
   *(This command downloads all local builders like Vite, React, and Lucide into your project so your computer knows how to compile the files. Wait 1-2 minutes for this to complete).*
7. **Compile and Deploy straight to unitycorebk.com**:
   ```cmd
   npm run deploy
   ```
   *(This simple script automatically builds your React project and sends it directly to your Firebase hosting domain instantly!)*

---

### 🚨 Troubleshooting: "ACME challenge failed for 162.245.237.18" (SSL Not Provisioning)

Your `nslookup` command reveals the exact root cause of the error:
- Your domain `unitycorebk.com` is actively using **Cloudflare Nameservers** (resolving to Cloudflare IPs `104.21.9.88` / `172.67.159.168`).
- **Why this matters**: Because you pointed your nameservers to Cloudflare earlier, **changing or deleting DNS records in your old cPanel, Hostinger, or Namecheap panel has absolutely NO EFFECT anymore!** 
- Cloudflare's dashboard is now the **ONLY** place that controls your domain records. Inside your Cloudflare panel, there is still an old **A Record** pointing to your old cPanel server (`162.245.237.18`) under a "Proxied" (orange cloud) status. When Firebase or Let's Encrypt tries to verify the domain, Cloudflare forwards the request to the old cPanel server, which fails with **404 Not Found**.

---

#### 🛠️ How to fix this in Cloudflare in Under 2 Minutes:

1. **Log in to your Cloudflare Dashboard**:
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in with your account.
   - Click on your domain **`unitycorebk.com`**.

2. **Open the DNS Management Panel**:
   - In the left sidebar menu, click on **DNS** -> **Records**.

3. **Find and Update the A Records**:
   - Look for the **A Record** where the *Name* is **`@`** (or `unitycorebk.com`) and the *Content/Target* is currently your old IP `162.245.237.18`.
   - Click **Edit** on that record.
   - **Change the IP Address** to your **Firebase Hosting IP address** (the IP address shown in your Firebase Custom Domain setup screen, e.g. `199.36.158.100` or `151.101.1.124`).
   - **CRITICAL FOR SSL**: Toggle the yellow **"Proxy status"** switch from **"Proxied" (Orange cloud)** to **"DNS Only" (Gray cloud)**. 
     - *Why? Let's Encrypt needs to see Firebase's IP directly. If Cloudflare hides it behind the orange cloud proxy, Firebase's SSL generator cannot complete the ACME challenge!*
   - Click **Save**.

4. **Do the Same for `www` (If configured)**:
   - If you also linked `www.unitycorebk.com` in Firebase, find the `www` A record (or CNAME) in Cloudflare.
   - Edit it, point it to the second Firebase IP (or your Firebase subdomain), and toggle its Proxy status to **"DNS Only" (Gray cloud)**.
   - Click **Save**.

5. **Wait 2 Minutes & Refresh Firebase**:
   - Go back to your [Firebase Console Hosting Dashboard](https://console.firebase.google.com/project/ai-studio-applet-webapp-797cd/hosting/main).
   - Click **Refresh** or **Verify**.
   - Your domain status will instantly update to **"Connected"** (or point to "Processing" and then complete within minutes). Firebase will now successfully complete the secure **SSL certificate request**!

6. **Optional (After secure green padlock appears)**:
   - Once your site is live with `https://` on Firebase, you can safely return to your Cloudflare DNS panel and toggle those switches back to **"Proxied" (Orange cloud)** if you want Cloudflare's attack protection. Just ensure your Cloudflare **SSL/TLS encryption mode** (under SSL/TLS tab) is set to **"Full"** or **"Full (strict)"** so Cloudflare communicates securely with Firebase's new certificate.

---

### 🎉 How to deploy updates anytime:
Whenever you make a change in your code and want to upload it to your live domain **`https://unitycorebk.com`**, simply open your Command Prompt in your folder and run:
```cmd
npm run deploy
```
This single script handles compiling the files, clearing old caches, and deploying them to Google Cloud immediately with zero complex steps!

---

## 🛠️ Step 1: Getting Project Files from Google AI Studio

To prepare your build files and download them to your local computer:

### Option A: Download the Prebuilt Web Zip Directly (Recommended)
Our system has already prepared a ready-to-use production bundle for you called **`public_html.zip`**. 
1. Use the **File Explorer** in the left outline of your Google AI Studio workspace.
2. Locate the file named **`public_html.zip`** in the root directory.
3. Right-click on `public_html.zip` and select **Download** to save it directly to your computer.
*(This zip file contains your optimized HTML, CSS, and JS assets mapped directly to the root, ready for immediate cPanel upload.)*

### Option B: Export Entire Project Source Code (To Run/Modify Locally)
If you wish to download your files to run, edit, or develop the code in your own local environment:
1. In the top-right menu of your Google AI Studio panel, click on **Settings** (or the project export options).
2. Click **Export as ZIP** or **GitHub** to transfer the complete source codebase.
3. Unzip the package on your computer.

---

## 💻 Step 2: How to Run & Build Files Locally (Optional)

If you chose **Option B** and want to run or test the codebase locally on your Windows machine, we highly recommend using **Windows PowerShell** (which is much newer, safer, and faster than CMD).

### 1. Prerequisites:
- Ensure you have **Node.js** (v18 or higher) installed on your system.
  - Download from: [nodejs.org](https://nodejs.org) (Choose the **LTS** installer).
  - Run the installer and accept all default configurations (it will set up both Node and `npm` in your system environment variables).

---

### 2. What is Windows PowerShell & How to Open It?
Windows PowerShell is a powerful command tool built directly into Windows 10 and Windows 11. **You do not need to download or install anything to get it!** It is already on your computer.

Here are the three easiest ways to find and open it inside your project folder:

#### Method A: Open From Inside Your Folder (Recommended)
1. Open your unzipped folder **`unitycore-bank (2)`** in Windows File Explorer.
2. Hold down the **`Shift`** key on your keyboard.
3. While holding **`Shift`**, **right-click** anywhere in the empty space inside that folder.
4. Click on **"Open PowerShell window here"** (or **"Open in Terminal"** if on Windows 11).
5. A blue or dark-colored terminal window will pop up. It is already pointed exactly to `C:\Users\HP\Downloads\unitycore-bank (2)`!

#### Method B: Search from the Start Menu
1. Press the Windows Start key or click the Search bar in your taskbar.
2. Type **`PowerShell`**.
3. Click on **Windows PowerShell** to open it.
4. To go to your project folder, copy and paste this command and press **Enter**:
   ```powershell
   cd "C:\Users\HP\Downloads\unitycore-bank (2)"
   ```

#### Method C: Address Bar Shortcut
1. Open your unzipped folder **`unitycore-bank (2)`** in Windows File Explorer.
2. Click on the address bar at the very top of the window (where it displays the folder path).
3. Delete everything in the address bar, type **`powershell`**, and press **Enter**.
4. The PowerShell window will instantly open inside that exact directory!

---

### 3. Build & Run Commands inside Windows PowerShell:
Once you have the PowerShell window open in your directory, run these commands:

* **Verify Node & NPM are ready**:
  ```powershell
  node -v
  npm -v
  ```
  *(This should output version numbers like `v18.x.x` and `9.x.x`)*

* **Install Dependencies**:
  ```powershell
  npm install
  ```
  *(This downloads all necessary building blocks into your local `node_modules` directory. Since you opened PowerShell, it should run smoothly without the path error you saw in CMD.)*

#### ⚠️ PowerShell Troubleshooting: "Script Execution is Disabled" (If seen)
If Windows blocks you from running commands due to its execution policy, paste this fix and press **Enter**:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then try your `npm install` command again!

* **Start the Local Development Server**:
  ```powershell
  npm run dev
  ```
  *Your PowerShell window will display a message like `Local: http://localhost:3000/`. Keep this window open, open your web browser, and navigate to **`http://localhost:3000`** to test your application in real-time!*

* **Build the Production-Ready Website**:
  When you are satisfied with local testing and want to build the optimized assets for cPanel:
  1. Press `Ctrl + C` inside your PowerShell window and type `Y` to stop the dev server.
  2. Compile your static assets by running:
     ```powershell
     npm run build
     ```
  3. **This generates a brand new folder named `dist` inside your project root.**
  
  #### ⚠️ IMPORTANT: Why is there no "dist" (or "gist") folder yet?
  If you just unzipped your downloaded source code code folder, **you will NOT see the `dist` (sometimes auto-corrected to "gist") folder yet!**
  - This folder **does not come with the initial export** because it contains build results.
  - It only automatically appears in your folder **after** you run the `npm run build` command above!

### 4. Compacting Your Build for cPanel Hosting:
After compilation completes on your Windows machine (and the `dist` folder appears):
1. Open the newly created **`dist`** folder in Windows File Explorer.
2. Select **all files and folders inside `dist`** (Press `Ctrl + A` to select `assets` folder and `index.html`).
3. Right-click the selection, choose **Compress to ZIP file** (or `Send to -> Compressed (zipped) folder` if using Windows 10).
4. Name the zip **`public_html.zip`**.
5. This ZIP is now fully ready to upload straight to your cPanel File Manager!

---

## 🔥 Step 3: Firebase Configuration & Live Setup

To make dynamic services such as **Database Operations** and **Google Sign-In** work on your live domain (`unitycorebk.com`), configure your own custom Firebase instance:

### 1. Create a Firebase Project
1. Visit the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google Account.
2. Click **Add Project**, name it something like `unitycorebk`, and follow the steps.

### 2. Configure Firestore Database & Schema Rules
1. In the Firebase left navigation bar, go to **Firestore Database** and click **Create Database**.
2. Select your closest geographical database region, choose to start in **Production mode**, and click **Create**.
3. Under the **Rules** tab of your Firestore Database screen, replace the default configuration with the security setup tested in our codebase:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
       function isSignedIn() { return request.auth != null; }
       function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
       function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
       function incoming() { return request.resource.data; }
       function existing() { return resource.data; }
       function isAdmin() {
         return isSignedIn() && 
           exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       function isValidUser(data) {
         return data.id is string && isValidId(data.id) &&
           data.username is string && data.username.size() >= 2 && data.username.size() <= 128 &&
           data.email is string && data.email.size() <= 256 &&
           data.name is string && data.name.size() <= 256 &&
           data.role in ['user', 'admin'] &&
           data.accounts is list && data.accounts.size() <= 10 &&
           data.cards is list && data.cards.size() <= 10 &&
           data.unreadNotifications is int && data.unreadNotifications >= 0;
       }
       function isValidTransaction(data) {
         return data.id is string && isValidId(data.id) &&
           data.description is string && data.description.size() <= 256 &&
           data.amount is number &&
           data.date is string && data.date.size() <= 64 &&
           data.timestamp is int &&
           data.category is string && data.category.size() <= 64;
       }
       function isValidAuditLog(data) {
         return data.id is string && isValidId(data.id) &&
           data.timestamp is string && data.timestamp.size() <= 64 &&
           data.userId is string && isValidId(data.userId) &&
           data.username is string && data.username.size() <= 128 &&
           data.action is string && data.action.size() <= 64 &&
           data.details is string && data.details.size() <= 512 &&
           data.status in ['success', 'failed', 'warning'];
       }
       match /users/{userId} {
         allow list: if isSignedIn() && (resource.data.id == request.auth.uid || isAdmin());
         allow get: if isOwner(userId) || isAdmin();
         allow create: if isOwner(userId) && isValidUser(incoming()) && incoming().role == 'user' && incoming().id == userId;
         allow update: if isSignedIn() && (
           (isOwner(userId) && isValidUser(incoming()) && incoming().id == existing().id && incoming().role == existing().role && incoming().username == existing().username && incoming().email == existing().email && incoming().diff(existing()).affectedKeys().hasOnly(['accounts', 'cards', 'unreadNotifications'])) ||
           (isAdmin() && isValidUser(incoming()) && incoming().id == existing().id)
         );
         allow delete: if isAdmin();
       }
       match /users/{userId}/transactions/{transactionId} {
         allow list: if isSignedIn() && (userId == request.auth.uid || isAdmin());
         allow get: if isOwner(userId) || isAdmin();
         allow create: if isOwner(userId) && isValidId(transactionId) && isValidTransaction(incoming());
         allow update, delete: if false;
       }
       match /auditLogs/{logId} {
         allow list, get: if isAdmin();
         allow create: if isSignedIn() && isValidId(logId) && incoming().userId == request.auth.uid && isValidAuditLog(incoming());
         allow update, delete: if false;
       }
     }
   }
   ```
4. Click **Publish** to enforce real-time enterprise rules blocking unauthorized database manipulation.

### 3. Configure Google Authentication Providers
1. From the left menu, select **Authentication** and click **Get Started**.
2. Under the **Sign-in method** tab, click **Add new provider** and select **Google**.
3. Toggle Google login to **Enable**.
4. Configure your support email, click **Save**, and add your custom domains under Authorized domains if prompted.

### 4. Link Firebase Config to your source code
1. Go back to your **Project Overview** page (top left of Firebase dashboard).
2. Under project settings, click the **Web Icon (</>)** to register a new web app. Set the name as `unitycore-web`.
3. Firebase will generate a configuration block resembling:
   ```json
   {
     "apiKey": "YOUR-API-KEY",
     "authDomain": "your-app.firebaseapp.com",
     "projectId": "your-app",
     "storageBucket": "your-app.firebasestorage.app",
     "messagingSenderId": "0000000000",
     "appId": "1:0000:web:0000",
     "firestoreDatabaseId": "(default)" 
   }
   ```
4. Replace the contents of `firebase-applet-config.json` in your local project folder (or within this workspace before downloading Option A's ZIP) with this newly generated JSON configuration. If you replace it in the workspace first, rerun `npm run build` so that the live files automatically bundle with your keys!

---

## 📤 Step 4: Uploading to cPanel File Manager

Once you've bundled your app with your updated Firebase configurations, upload it using cPanel:

1. Log in to your hosting account's **cPanel admin portal** (usually reached via `https://unitycorebk.com:2083` or through your registrar dashboard).
2. Find the **Files** group block and click on the **Files Manager** tool.
3. In the directory directory tree, open the folder labeled **`public_html`**.
   - *Delete or rename any generic `index.php` or static holding screens created by your hosting provider to ensure they do not clash with our new site.*
4. From the top toolbar menu of the File Manager, click **Upload**.
5. Select or drag the updated **`public_html.zip`** file into the upload zone.
6. Once the progress bar reaches 100% and turns green, click **Go back** to return to the active folder array.

#### ⚠️ CRITICAL: Troubleshooting "Archive: missing bytes in zipfile / attempt to seek before beginning" Error
If cPanel fails to extract the ZIP and throws this error:
> `Archive: ... public_html (2).zip`
> `caution: zipfile comment truncated`
> `error: missing 4026784310 bytes in zipfile... attempt to seek before beginning`

**Why this happens:** This is a well-known technical glitch on Linux/cPanel servers when trying to unzip files generated by Node.js (`adm-zip` library). The server's `unzip` utility misreads the header offsets, thinking the file is 4GB larger than it actually is!

**How to fix this in 1 minute using your computer:**
To bypass this formatting issue completely, compile the project locally on your Windows machine and zip it using Windows' native companion tool:
1. Make sure your Windows PowerShell window is open in your project folder (`C:\Users\HP\Downloads\unitycore-bank (2)`).
2. Look at your folder files—if you don't have a **`dist`** folder yet, run:
   ```powershell
   npm run build
   ```
   *(This takes 5 seconds to run and compiles your website cleanly inside a brand-new `dist` folder).*
3. Open the newly created **`dist`** folder inside your unzipped directory in Windows File Explorer.
4. Select all items inside `dist` (press **`Ctrl + A`** to highlight `assets` and `index.html` together).
5. **Right-click** on the highlighted selection, hover over **`Send to`**, and select **`Compressed (zipped) folder`** (or click **`Compress to ZIP file`** if using Windows 11).
6. Name this new zip file **`windows_upload.zip`**.
7. Upload **`windows_upload.zip`** to cPanel instead of the prebuilt one! Because it was compressed natively by Windows, cPanel will extract it 100% successfully on the very first try with zero errors.

7. Locate your newly uploaded **`windows_upload.zip`** (or successfully transferred zip) in the File Manager, click it, and select **Extract** from the top menu list.
8. Retarget the destination index location inside `/public_html` and click **Extract Files**.
9. Verify that the file layout displays:
   ```text
   📂 public_html/
   ├── 📂 assets/
   │   ├── index-[hash].js
   │   └── index-[hash].css
   └── 📄 index.html
   ```
10. Highlight `public_html.zip` and click **Delete** from the top bar to save host space safely.

---

## 🛸 Step 5: Resolving Apache Redirection (Configuring `.htaccess`)

Single Page Applications use dynamic paths processed directly inside the client's browser. If a visitor types `unitycorebk.com/user-dashboard` directly or reloads the browser, cPanel's Apache server attempts to look for a physical folder `/user-dashboard` on the server and throws a "404 Not Found" error.

To redirect all dynamic requests back to our client router:

1. In the top right corner of cPanel **File Manager**, select **Settings** (Gear Icon ⚙️).
2. Check the box labeled **Show Hidden Files (dotfiles)** and click **Save**.
3. Under your `/public_html` menu directory, click **+ File** (top left).
4. Name the new file exactly: **`.htaccess`** and click **Create New File**.
5. Right-click on `.htaccess` and select **Edit**.
6. Paste the following configuration script precisely:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     
     # Forward directories and physical assets to resolve directly
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     
     # Bounce all virtual routes back to the main homepage script
     RewriteRule . /index.html [L]
   </IfModule>
   ```
7. Click **Save Changes** and click **Close**.

---

## ⚡ Step 6: Verify and Go Live

Your server setup is complete! Open your browser, head to **`https://unitycorebk.com`**, and enjoy your brand new, modern, secure banking interface. 

- **Check Mobile Responsiveness**: Ensure that the clean, dark UI balances margins and elements perfectly.
- **Verify Sign-In Flow**: Double-check that Google Login and Username Bypass routes execute smoothly and write to your Firestore Ledger instantly!
- **Refresh/Flush Cache**: If you see a styled layout but none of your recent edits, hold `Ctrl + F5` or close and reopen the browser to clear static caches.
