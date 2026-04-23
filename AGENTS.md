# AGENTS.md

## Commands

- `npm run dev` - Start dev server (http://localhost:5173)
- `npm run build` - Build production bundle to `dist/`
- `npm run deploy` - Deploy to GitHub Pages
- `python scraper/scrap.py` - Update course data from KFU (requires `pip install -r scraper/requirements.txt` first)

## Architecture

- **Frontend**: React + TypeScript + Vite in root
- **Data**: Python scraper in `scraper/` writes to `public/ccsit_male_courses.csv` and `public/ccsit_female_courses.csv`
- **Deployment**: GitHub Pages via `gh-pages` package, CI runs on push to `main`

## CI/CD

- `.github/workflows/deploy.yml` - Builds and deploys on push to `main`
- `.github/workflows/update_schedule.yml` - Runs scraper every 2 hours, auto-commits CSV changes

## Notes

- No test suite or linting configured
- App reads CSV files directly from `public/` at runtime
- `metadata.json` stores build metadata