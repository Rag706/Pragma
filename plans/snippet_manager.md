# Snippet Manager — Project Plan

## Overview
A Windows background application that lets the user paste pre-written text snippets anywhere on the system (Outlook, Teams, browser, Excel, etc.) using a global hotkey. Snippets are organized into categories and support variable placeholders that prompt the user for input before pasting.

The goal: eliminate repetitive copy-pasting from a master document. One hotkey, a clean popup menu, select a template, fill in any blanks, and the text is pasted directly into whatever field is active.

---

## Core Features

### 1. Global Hotkey Activation
- Pressing the hotkey anywhere on Windows opens the snippet popup near the cursor
- **Proposed default:** Double-tap Shift (Shift Shift)
- **Alternative (safer):** Ctrl+` (backtick) or Ctrl+Space — double-Shift can conflict with Windows Sticky Keys accessibility feature
- **Ask user at start of session:** Confirm preferred hotkey, or let them configure it in settings

### 2. Popup Menu
- Appears near the cursor position, floating above all other windows
- Dark themed, modern design (NOT the default Windows grey context menu look)
- Dismisses when user clicks outside or presses Escape
- **Navigation style:** Two options discussed — ask user to confirm:
  - **Option A (Drill-down):** Click a category → list slides/transitions to show templates in that category, with a back button
  - **Option B (Two-column):** Categories listed on the left, templates for selected category shown on the right simultaneously
  - *User leaned toward drill-down but this was not confirmed — ask at start of session*

### 3. Snippet Categories and Templates
- Snippets are organized in a two-level hierarchy: **Category → Template**
- Example structure the user has in mind:
  ```
  Email Templates
    ├── Project status update
    ├── Meeting follow-up
    └── Escalation notice
  Personal Info
    ├── Full name + title
    └── Office address
  WBSe Codes
    ├── Project A code
    └── Project B code
  Meeting Agendas
    └── Weekly standup
  ```
- Scale: larger library expected (more than a few dozen snippets across multiple categories)
- Content: plain text only to start; rich text (bold, bullets) can be added later

### 4. Variable Placeholders
- Templates can contain variables using double-brace syntax: `{{variable name}}`
- Example: `Dear {{Recipient Name}}, following our call on {{Meeting Date}}, I wanted to confirm...`
- When a template with variables is selected:
  - The popup closes
  - A small centered dialog appears asking for the first variable
  - User fills it in and presses Enter or clicks Next
  - Next variable prompt appears (one at a time — confirmed by user)
  - After all variables are filled, the completed text is pasted into the active field
- Variable names in the braces serve as the prompt label shown to the user

### 5. Paste Behavior
- After snippet selection (and variable filling if needed), text is pasted directly into whatever was active before the popup opened
- Uses clipboard + simulated Ctrl+V for maximum compatibility across apps

### 6. Snippet Management
- Two access points for managing snippets (both confirmed by user):
  - **From the popup:** A "Manage Snippets" option at the bottom opens the management web app in the browser
  - **Separate management app:** A React web app (same dark theme as TaskFlow) accessible directly, for adding/editing/deleting snippets and categories
- Management UI should support: create category, rename category, reorder categories, create template, edit template (with variable highlighting), delete, and reorder templates within a category

### 7. System Tray
- The Python background process runs as a system tray icon (bottom-right of Windows taskbar)
- Right-clicking the tray icon shows options: Open Management, Settings, Exit
- **Startup behavior:** Ask user — auto-start with Windows, or manually launched like TaskFlow?

---

## Proposed Tech Stack

### Background process (Python)
- **`keyboard` library** — global hotkey detection (works system-wide including inside Outlook, Teams, Excel)
- **`pystray`** — system tray icon
- **`pyperclip` + `pyautogui`** — clipboard set + Ctrl+V paste into active window

### Popup UI (PyQt6)
- Frameless window, always-on-top, appears at cursor position
- Dark themed with custom styling (not native OS widget look)
- Fast to show because the window is pre-loaded and hidden, not created fresh each time
- PyQt6 chosen over .NET/WinForms because Python is already installed and working on the user's machine, and PyQt6 supports modern dark UI styling
- *Alternative considered: Electron/web-based popup — heavier but more design-flexible. Can revisit if PyQt6 popup feels limited.*

### Management UI (React web app)
- Same React + Vite + TailwindCSS stack as TaskFlow
- Runs on a local port (e.g. localhost:5175)
- Can be opened from the system tray or from within the popup
- Consistent dark theme with TaskFlow

### Data Storage
- SQLite database (managed by a small FastAPI backend, consistent with TaskFlow pattern)
- Schema: Categories table (id, name, sort_order), Snippets table (id, category_id, name, content, sort_order)

---

## Open Design Questions (ask user at start of new session)

1. **Hotkey confirmation:**
   - Double-Shift risks conflicting with Windows Sticky Keys (an accessibility feature that activates when Shift is pressed 5 times, but can be triggered by fast repeated presses on some setups)
   - Recommended alternatives: `Ctrl+\`` or `Ctrl+Space` or a custom configurable hotkey
   - Ask user: confirm double-Shift, or choose an alternative?

2. **Popup navigation style:**
   - Drill-down (click category → see templates, back button to return) — cleaner for large libraries
   - Two-column (categories left, templates right) — faster for power users
   - User expressed preference for drill-down but did not confirm — ask again with a visual description

3. **Windows auto-start:**
   - Should the snippet manager start automatically when Windows boots (added to startup)?
   - Or manually launched by the user (like TaskFlow)?

4. **Hotkey conflict behavior:**
   - If the user is typing in a password field or a sensitive input, the popup should not activate
   - Can detect this partially but not perfectly — is this a concern?

5. **Snippet import:**
   - Does the user want to be able to import existing snippets from a CSV or text file at setup?
   - Or start fresh and build the library through the management UI?

6. **Popup search:**
   - For a larger library, a search/filter bar inside the popup (type to filter snippets by name) would be very useful
   - Should this be included from the start or added later?

---

## Development Phases

1. **Phase 1:** Management web app — CRUD for categories and snippets, variable placeholder support in the editor, preview mode
2. **Phase 2:** Python background process — system tray icon, hotkey detection, reads snippet data from the database
3. **Phase 3:** PyQt6 popup menu — appears on hotkey, shows categories and templates, drill-down navigation
4. **Phase 4:** Variable prompt dialogs — one at a time input flow, paste completed text
5. **Phase 5:** Polish — search in popup, reorder snippets via drag-and-drop, auto-start option, settings page

---

## Notes

- The user confirmed: **plain text only to start**. Rich text (bold, bullet points, HTML) can be added in a future version.
- The user confirmed: **no LLM or external API required**. Fully local, no internet dependency.
- The user wants the app to feel modern and polished — dark theme, clean typography — not like a utility tool.
- The user's use case involves frequent text in professional/corporate contexts (Accenture): email templates, WBSe codes, personal info, meeting agendas. Privacy is important — local-only is a feature, not a limitation.
