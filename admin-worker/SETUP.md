# LH Cars admin page: one-time setup

The admin page is at **https://lhcars.my/admin/**. It is hidden from Google (noindex + robots.txt) and only
**Skywalking-Luke** can sign in. Sign-in goes through a small Cloudflare Worker and a GitHub App, so no
password or long-lived token is ever saved on the site, on a device, or in this repository.

All three steps can be done in Safari/Chrome on the iPad. Step 2 needs a terminal once (any computer, or
Cloudflare's dashboard editor; see 2b).

## 1. Create the GitHub App (5 minutes)
1. Open https://github.com/settings/apps/new
2. Fill in:
   - **GitHub App name:** `LH Cars Admin` (add something if the name is taken)
   - **Homepage URL:** `https://lhcars.my`
   - **Callback URL:** `https://lh-cars-admin.<your-subdomain>.workers.dev/callback` (you get the address in step 2; you can come back and edit this)
   - Tick **Expire user authorization tokens**. Leave "Request user authorization (OAuth) during installation" unticked.
   - **Webhook:** untick **Active**.
   - **Repository permissions:** **Contents: Read and write**. (Metadata: Read-only is added automatically.) Nothing else.
   - **Where can this GitHub App be installed?** **Only on this account**.
3. Click **Create GitHub App**. On the next page copy the **Client ID**, then click **Generate a new client secret** and copy it.
   Keep both for step 2. Do not paste them anywhere else.

## 2. Deploy the sign-in Worker (Cloudflare, free plan)
### 2a. With a terminal
```
cd admin-worker
npx wrangler login
npx wrangler secret put CLIENT_ID        # paste the Client ID
npx wrangler secret put CLIENT_SECRET    # paste the client secret
npx wrangler deploy
```
`wrangler deploy` prints the Worker address, e.g. `https://lh-cars-admin.luke.workers.dev`.

### 2b. Without a terminal (iPad)
Cloudflare dashboard › Workers & Pages › Create › Worker › name it `lh-cars-admin` › Deploy › Edit code: paste
`admin-worker/src/index.js` and deploy. Then Settings › Variables and secrets: add
`ALLOWED_LOGIN = Skywalking-Luke`, `ALLOWED_ORIGIN = https://lhcars.my`, `ADMIN_URL = https://lhcars.my/admin/`
as text, and `CLIENT_ID`, `CLIENT_SECRET` as **Secret**. Turn **Logs / Observability off**.

### 2c. Connect the pieces
- In the GitHub App settings set the **Callback URL** to `<Worker address>/callback`.
- In `admin/admin.js`, replace `https://lh-cars-admin.REPLACE-ME.workers.dev` with the Worker address and commit.

## 3. Install the app on the repository
GitHub App settings › **Install App** › your account › **Only select repositories** › `lh-cars` › Install.

## Using it
Open https://lhcars.my/admin/ and tap **Sign in with GitHub**. A sign-in lasts up to 8 hours or until you tap
**Sign out** or close the tab.

### Add to Home Screen
- **Android (Chrome):** open the admin page › ⋮ menu › **Add to Home screen** (or **Install app**). It opens full-screen
  like an app. Photos: tap **Choose photos**; the picker shows Photos/Gallery, and **WhatsApp Images** under
  *Browse* or the folder list.
- **iPad (Safari):** Share › **Add to Home Screen**. If sign-in ever loops back to the sign-in screen from the Home
  Screen icon, open the page in a normal Safari tab instead (iPadOS sometimes finishes GitHub sign-in in a separate
  browser window).
The Home Screen icon does not change anything about privacy: the page is still noindex and still needs sign-in.

### Photos
- Any number of photos. WhatsApp photos are used as they are when they are already 1600 px or smaller (no extra
  compression, never enlarged). Bigger photos are resized to 1600 px on the long side. Rotation info from the camera
  is respected and all camera/GPS data is removed when a photo is re-saved.
- iPhone/iPad HEIC photos are converted automatically (also in Chrome/Edge on Windows and Android).
- On a computer you can drag photos, or a whole folder, onto the photo box.

## If something goes wrong
- **"not installed on the lh-cars repository"**: redo step 3.
- **"Sign-in expired"**: sign in again. Anything not yet published on the form has to be re-entered.
- To lock everything immediately: GitHub › Settings › Applications › Authorized GitHub Apps › LH Cars Admin › Revoke,
  or suspend the app installation.

## Tests (for developers)
```
cd admin-worker
npm i --no-save miniflare@3 && node test/worker.test.mjs   # sign-in Worker
node test/parse.test.mjs                                     # WhatsApp paste parser
```
