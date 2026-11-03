# HTML-to-APK-Builder

A small HTML-to-Android APK builder. The website uploads a single HTML file (and optional icon) to a Cloudflare Worker. The Worker stores the upload in this repository and starts GitHub Actions. GitHub Actions builds a real debug APK and publishes it as a short-lived artifact.

## 1. Upload this project to GitHub

Upload the contents of this ZIP into the root of `RobloxUserCool/HTML-to-APK-Builder`, preserving folders such as `.github/workflows`.

The default branch must be `main`.

## 2. Create a GitHub token

Create a fine-grained personal access token for **only this repository**:
- Repository access: `HTML-to-APK-Builder`
- Repository permissions: `Contents` = Read and write
- Repository permissions: `Actions` = Read and write

Copy the token once. Do not put it into `index.html` or share it.

## 3. Create a Cloudflare Worker

Create a new Worker, for example `html-to-apk-api`, and paste the full contents of `worker.js` into its editor. Deploy it.

In Worker settings, add a secret:
- Name: `GH_TOKEN`
- Value: your GitHub fine-grained token

The Worker is configured for `RobloxUserCool/HTML-to-APK-Builder` on branch `main`.

## 4. Use the builder

Open `index.html` locally or host it as a static page. Enter the deployed Worker URL, app name, HTML file and optional square icon. Press **Собрать APK**.

The first build may take several minutes. The site downloads a ZIP artifact containing `app-debug.apk`; extract the APK from the ZIP and install it on Android.

## Notes and limitations

- This MVP wraps one self-contained HTML file. Remote HTTPS scripts, stylesheets and images can load if the phone has internet access. Separate local CSS/JS/image files are not bundled yet.
- This produces a **debug APK**, not a Play Store release-signed APK.
- GitHub Actions artifacts are retained for 3 days.
- Anyone who knows the public Worker URL can attempt to submit builds. Do not post the Worker URL publicly. For a public service, add Cloudflare Turnstile or another abuse-protection layer before sharing it.
- The APK uses Android WebView. Browser APIs unsupported by Android WebView may not work exactly like desktop Chrome.
