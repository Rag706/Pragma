# myTE / myTIM Updater — Project Plan

## Overview
A local web application that acts as a master time log for the user's daily work hours and project time allocation. When ready, the user presses a "Sync" button and the app automatically fills in both Accenture time tracking web tools using browser automation.

This eliminates the manual process of opening two separate corporate web tools and typing in time values day by day.

---

## The Two Target Web Apps

### myTIM — Punch Clock
- **URL:** https://whm.accenture.com/mytim/secure/punchClock/confirm
- **Purpose:** Records daily start/end times and break times (like a punch clock)
- **Update frequency:** Daily
- **Data entered per day:**
  - 主たる勤務場所 (Work location): dropdown — アクセンチュア / 在宅勤務 / AIC(Tokyo) / 埼玉 etc.
  - Slot 1: 勤務開始 (Work start), 勤務終了 (Work end), 休憩開始 (Break start), 休憩終了 (Break end)
  - Slot 2 (optional): second work/break block for days with unusual schedules
  - Slots 3 and 4 exist but are rarely used
- **Typical pattern:** Most days follow the same structure — 09:00 start, 12:00–13:00 lunch, variable end time. Occasional special cases (e.g. different lunch time, two breaks).
- **Save button:** 勤務場所と打刻時間を保存する (bottom right of page)
- **Link button:** myTE連携画面へ — this pushes myTIM's work time (total hours) to myTE's bottom "Working Hours" row only. It does NOT fill in WBSe charge code hours.

### myTE — Charge Code Time Entry
- **URL:** https://myte.accenture.com/#/time (Single Page App, hash-based routing)
- **Purpose:** Records hours spent per project/activity charge code (WBSe) per day
- **Update frequency:** Once per half-month period (01–15, then 16–end of month)
- **Data entered:**
  - Work Location dropdown per day column (00 = default/unset, or specific location code)
  - Decimal hours per WBSe charge code per day (e.g. 4.8, 9.0, 10.5)
  - Multiple charge code rows visible simultaneously
- **Bottom rows (read-only / auto-calculated):** Total hours, Work Schedule, Statutory Holiday checkboxes, Daily Overtime, Working Hours
- **The Working Hours row** is the one populated by the myTIM 連携 button — user does NOT need to fill this manually
- **Save/Submit:** "Save" button saves as draft; "Submit" button finalizes the period

---

## What the Local App Needs to Do

### Data the user inputs in the local app:

**Daily Punch Log (feeds myTIM)**
- Per day: work location, start time, break start, break end, end time
- Support for a second break/work slot on special days
- Most days: only end time changes

**WBSe Time Log (feeds myTE)**
- Master list of WBSe codes with labels (project/activity name, category)
- Per half-month: hours per WBSe code per day
- WBSe codes are mostly fixed but can be updated in the master list

**Sync actions:**
- "Sync to myTIM" — fills the punch clock page for all logged days
- "Sync to myTE" — fills the charge code hours grid

---

## Proposed Tech Stack

Same as TaskFlow:
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** FastAPI + SQLite (stores punch log, WBSe codes, time entries)
- **Browser automation:** Playwright (Python) — called from the FastAPI backend

### Why Playwright over Selenium
- Better async support, integrates well with FastAPI
- More reliable waiting for SPA page elements (important for myTE's React/Angular app)
- Better cookie/session persistence

---

## SSO / Login Handling

Both sites use Accenture corporate SSO (likely SAML/Okta with MFA).

**Proposed approach:**
- Playwright opens a **visible** (non-headless) browser window
- User handles login and MFA manually the first time
- Playwright saves the browser session (cookies + storage) to a local file
- On subsequent syncs, the saved session is loaded — no re-login needed unless the session expires
- If the session has expired, the browser opens again for manual re-login

This is the safest approach for corporate SSO — no credentials are stored, no SSO is bypassed.

---

## CSV Import Investigation (to test during development)

myTE has a CSV export button. It may also accept CSV import. If it does:
- The sync would generate a correctly formatted CSV and use Playwright to trigger the import
- This would be faster and more reliable than clicking individual cells
- **To test:** during development, export a CSV from myTE and inspect the format, then try uploading a modified version

---

## Open Design Questions (ask user at start of new session)

1. **Separate app or integrated into TaskFlow?**
   - Option A: Standalone app with its own launcher and port (e.g. localhost:5174)
   - Option B: New section/page inside the existing TaskFlow app
   - *Consideration: TaskFlow already has Projects and Tasks. Time entries could link to TaskFlow projects via shared WBSe codes.*

2. **After Playwright fills in the form — auto-save or pause for review?**
   - Option A: Fill everything and auto-click Save/Save Draft — fully automated
   - Option B: Fill everything, then pause so the user can review before manually clicking Save
   - *Recommendation: Option B for safety, especially while testing*

3. **Half-month page structure in myTIM:**
   - The screenshot shows days 01–15. Is 16–31 a separate page navigation, or the same page scrolled?
   - This affects how the sync logic loops through days.

4. **Work location default:**
   - From the screenshot, most days are アクセンチュア or 在宅勤務. Should the local app have a "default location" that pre-fills all days, with the ability to override per day?

5. **myTE Work Location row:**
   - The "00" dropdown per day column at the top of myTE — does this need to be set, or is 00 the correct/default value for all days?

---

## Known Risks / Things to Investigate

- **myTE is a SPA** (URL: `#/time`) — Playwright must wait for the React/Angular grid to fully render before trying to fill cells. Need to inspect actual DOM element IDs/classes during development.
- **myTIM page structure** — the confirm page URL suggests it may be a multi-step flow. Need to verify the actual input page URL vs. the confirmation page.
- **Session expiry** — Accenture SSO sessions typically expire after 8–12 hours. The app should detect a redirect to the login page and prompt the user to re-authenticate.
- **myTE cell editing behavior** — some grid apps require a click to enter edit mode before typing. Need to test with Playwright's `.click()` then `.fill()` pattern.

---

## Development Phases

1. **Phase 1:** Build the local data entry UI (punch log + WBSe master + time entry grid). No automation yet.
2. **Phase 2:** Implement myTIM sync (simpler, standard time inputs).
3. **Phase 3:** Implement myTE sync. Test CSV import approach first; fall back to cell-by-cell if not available.
4. **Phase 4:** Session persistence, error handling, sync status feedback.
