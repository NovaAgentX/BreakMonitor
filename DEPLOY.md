# Deploying Team Clock (Login/Logout + Break Tracker)

There is no public sign-up. The Team Lead logs in first, then adds every
employee's username, role, and password from inside the app. Employees only
ever see their own login/logout history and breaks — never anyone else's.

## 1. Create a fresh Google Sheet + connect Code.gs

1. Create a new Google Sheet (this app makes its own tabs — don't reuse the
   old attendance-tracker sheet, since the structure here is different).
2. Extensions > Apps Script, paste in `Code.gs`, save.
3. Run `setup()` once (function dropdown at top > select `setup` > Run).
   Authorize permissions when prompted (Advanced > Go to project (unsafe) > Allow).
   This creates a **default Team Lead login**:
   - Username: `teamlead`
   - Password: `ChangeMe123`
   **Log in with this and change the password immediately** (use the
   password icon next to the sign-out button on the dashboard).

   > Already deployed an earlier version of this app? Re-run `setup()` once
   > after pasting in the updated `Code.gs` — it's safe to run again and
   > will just add the new **Sessions** sheet (used to keep people logged
   > in reliably) without touching your existing Users/AttendanceLog/BreakLog data.
   > Then also run `repairLegacyTimeFormatting()` once (same function
   > dropdown) — it fixes any existing rows that were showing garbled dates
   > like "Sat Dec 30 1899" or "NaN min" durations, caused by Google Sheets
   > silently auto-converting time text into date values. Safe to run
   > any time; it only rewrites Date/Time cells, nothing else.
4. Deploy > New deployment > Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Deploy, authorize again if asked, and copy the Web app URL.

   > **Updating an existing deployment?** Saving the script alone does
   > *not* update the live URL. Go to Deploy > Manage deployments > pick
   > your web app deployment > pencil/edit icon > Version: **New version**
   > > Deploy. The `/exec` URL stays the same, but it now runs your latest
   > code.

## 2. Connect the front-end

Open `script.js`, find this line near the top:

```js
const API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
```

Replace it with your real Web App URL from step 1.

## 3. Push to GitHub Pages

Push `index.html`, `dashboard.html`, `script.js`, and `style.css` to a GitHub
repo, then Settings > Pages > Deploy from branch `main`, folder `/ (root)`.

## How it works

- **Login only, no sign-up**: the sign-in page only has a username/password
  form. Employees never create their own accounts.
- **Team Lead adds employees**: once signed in as the Team Lead, an "Add
  Employee" panel appears on the dashboard — enter the employee's full name,
  a username, their role, and a temporary password, then hand those
  credentials to the employee. Roles: SEO Manager, SEO Executive, Social
  Media Manager, Social Media Executive, Software Developer, Digital
  Marketing Executive, Digital Marketing Specialist.
- **Login / Logout**: one big button that flips between the two states
  (labelled Login / Logout, not "Clock In/Out").
- **Breaks**: Casual, Lunch, Tea-time, Breakfast. Only one active break at a
  time — you must end the current one before starting another, and you can't
  log out while on a break.
- **Privacy**: regular employees only ever see their own login/logout and
  break history. The "Who's Online" live team board is visible to the Team
  Lead role only.
- **Change password**: anyone can change their own password from the
  dashboard using the password icon next to sign-out.

## Sheets created by setup()

- **Users**: Username, Full Name, Role, Password (hashed), Active — starts
  with one seeded row for the default Team Lead account (see step 1.3).
- **AttendanceLog**: Record ID, Username, Full Name, Role, Date, Login Time, Status, Logout Time, Logout Date
- **BreakLog**: Record ID, Username, Full Name, Break Type, Date, Start Time, End Time, Status, Duration
- **Settings**: Timezone (default Asia/Dubai)
- **Sessions**: Token, Username, Full Name, Role, Expires At — a durable
  backup of active logins. Login sessions are cached for speed, but also
  written here so a cache eviction can never show someone a false
  "Session expired" error seconds after logging in. Rows are cleaned up
  automatically as they expire; you generally never need to touch this sheet.

You generally shouldn't need to edit these by hand — the Team Lead adds
employees from the dashboard, and the rest is written by the app itself as
people use the login/break buttons.
