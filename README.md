# Pre-Prod Dashboard

A modern MVP web app to manage **pre-production of garment manufacturing**. Upload an order
chart, and the app derives a Pre-Prod chart (one row per **Global Style**), shown in a grid with
Excel export. No login / backend — all data is stored in the browser (`localStorage`), so it
deploys to Netlify as a static site.

Theme: red `#ec1e2f` + white.

## Pages

| Page | What it does |
|------|--------------|
| **Dashboard** | Cards + charts: total styles, merchants, destinations covered, pending SO approvals, New vs Repeat, SO approval status, top destinations, styles by plant / merchant, PP colour spread. |
| **Pre-Prod Chart** | The grid. `+ Add rows` (top-left) imports an order chart; `Export` (top-right) opens a filter drawer → Excel. Row edit & delete. |
| **Merchants** | Add / edit / delete merchants (Full name, Email, Status). These feed the merchant lookup. |
| **History** | Every import & export with file name and timestamp. |

## How the Pre-Prod chart is built from the order chart

- Order-chart lines are **grouped by `GLOBAL STYLE`** → one Pre-Prod row per style.
- **Destination** and **PP color** collect every unique value across the style's lines and show as
  **chips** in the grid (comma-separated when exported).
- All other fields take the first non-empty value from the style's lines.
- **Inquiry No** and **Bulk Merchant / PD name** are entered in the Add-rows popup.
- **Fabric Quality** and **Fabric Mill** start empty for manual entry (row edit).
- Empty order-chart fields stay empty.

Column headers are auto-detected (case/space/punctuation-insensitive, with common aliases), so
`GLOBAL STYLE`, `Global Style`, `globalstyle` etc. all map correctly. The first worksheet is used;
`.xlsx`, `.xls` and `.csv` are supported.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Deploy to Netlify

The repo already includes `netlify.toml` and `public/_redirects` (SPA fallback). Either:

- **Drag & drop:** run `npm run build`, then drop the `dist/` folder onto Netlify, **or**
- **Git:** connect the repo — Netlify auto-detects build command `npm run build` and publish dir
  `dist`.

## Tech

Vite · React + TypeScript · React Router · Recharts · SheetJS (`xlsx`) · lucide-react icons ·
localStorage persistence.

## Notes

- Data lives in the browser under the key `preprod-dashboard-data-v1`. Clearing site data resets
  the app. Two demo merchants are seeded on first run.
- This is an MVP: no authentication, no server. To share data across users/devices later, swap the
  `src/store/store.tsx` persistence for an API.
