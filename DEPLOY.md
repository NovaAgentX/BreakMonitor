# Deploying Team Clock (Login/Logout + Break Tracker)

This is a self-service tool — there's no admin. Each person creates their own
account, picks their role, and logs their own clock-in/out and breaks.

## 1. Create a fresh Google Sheet + connect Code.gs

1. Create a new Google Sheet (this app makes its own tabs — don't reuse the
   old attendance-tracker sheet, since the structure here is different).
2. Extensions > Apps Script, paste in `Code.gs`, save.
3. Run `setup()` once (function dropdown at top > select `setup` > Run).
   Authorize permissions when prompted (Advanced > Go to project (unsafe) > Allow).
4. Deploy > New deployment > Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Deploy, authorize again if asked, and copy the Web app URL.

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

- **Sign up**: anyone can create an account from the "Create Account" tab —
  full name, a unique username, one of 6 roles, and a password. No approval
  needed.
- **Clock In / Clock Out**: one big button that flips between the two states.
- **Breaks**: Casual, Lunch, Tea-time, Breakfast. Only one active break at a
  time — you must end the current one before starting another, and you can't
  clock out while on a break.
- **Who's Online**: a live board (refreshes every 20s) showing everyone's
  current status — Working, on a specific break, or Offline.
- **My History**: your own recent clock-in/out and break records.

## Sheets created by setup()

- **Users**: Username, Full Name, Role, Password (hashed), Active
- **AttendanceLog**: Record ID, Username, Full Name, Role, Date, Login Time, Status, Logout Time, Logout Date
- **BreakLog**: Record ID, Username, Full Name, Break Type, Date, Start Time, End Time, Status, Duration
- **Settings**: Timezone (default Asia/Dubai)

You generally shouldn't need to edit these by hand — everything is written by
the app itself as people sign up and use the clock/break buttons.
