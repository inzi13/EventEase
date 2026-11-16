# EventEase – Event Registration Website

## Run locally
1. Unzip the folder.
2. Double-click `index.html` (works in any modern browser, no server or install needed).
   Optional: `python3 -m http.server 8000` inside the folder, then open http://localhost:8000

## Files
- `index.html` – structure (home, register, confirmation, admin views)
- `css/style.css` – navy + purple theme, responsive layout
- `js/app.js` – events, validation, registration, admin logic (localStorage)

## Admin
Open the **Admin** link. Default passcode: `admin123` (change `ADMIN_PASSCODE` at the top of `js/app.js`).
Admins can view/search/delete participants, export CSV, and add or remove events.

## Notes
- Data lives in your browser's localStorage. To reset, clear site data for the page.
- This is a front-end demo; the passcode is not real security. Use a backend for production.
