# AquaScope Frontend v2

A polished React + Vite prototype for **QDR-Based Aquatic Population Mapping: Molecular Water Analysis and Graphical Visualization of Fish Distribution in Water Bodies**.

## Requirements
- Node.js 20.19+ (or a compatible current LTS version)
- npm
- VS Code recommended

## Run locally
1. Extract this ZIP.
2. Open the `aquascope-frontend-v2` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open the local URL Vite prints, usually `http://localhost:5173`.

## Build check
```bash
npm run build
npm run preview
```

## Frontend features
- Responsive teal-and-white research dashboard
- Optional dark theme
- Dashboard metrics computed from current records
- Charts generated from the local sample dataset
- Add sample form with required-field, duplicate-ID, signal-range, and coordinate validation
- Sample detail drawer and delete confirmation
- Search, status/water-body filters, and sorting
- CSV import and export
- Interactive Leaflet map with detection-status filter and clickable markers
- Local browser persistence via localStorage

## Demo data and scientific limitations
The included records, coordinates, taxa, status classifications, and 0–100 signal index are illustrative. QDR is not defined in this starter. Confirm the actual method, data fields, units, controls, detection limits, thresholds, and analysis rules before using real data. A molecular detection alone does not establish fish abundance. Map tiles and Google Fonts require internet access.

CSV import expects column names such as `Sample ID`, `Site`, `Water body`, `Taxon`, `Signal index (demo)`, `Status`, `Date`, `Latitude`, `Longitude`, and `Notes`. A header row with `id`, `site`, `water`, `taxon`, `signal`, `date`, `lat`, `lng`, and `notes` is also supported.

## Folder structure
```
aquascope-frontend-v2/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    └── index.css
```
