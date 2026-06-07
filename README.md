
# Happy Hour

Happy Hour is an internal hospitality operations tool for managing suppliers, invoices, recipes, rostering, ingredient pricing and AI-generated insights.

## Overview

- Manages supplier records, invoices and invoice file uploads.
- Tracks recipes, ingredients and ingredient price history.
- Schedules rostering, timesheets and team assignments.
- Generates and stores AI insights used by KPIs and reports.

## Tech stack & structure

- Backend: PHP with a Laravel-style codebase (app/, config/, routes/, etc.).
- Frontend: Vite + React inside the `frontend/` folder.
- Dependency managers: Composer (PHP) and npm (frontend).

## Key features (summary)

- Supplier and invoice lifecycle with invoice extraction (`ai_extraction_data`).
- Ingredient/recipe insights created and stored as `AiInsight` records.
- KPI creation and association to AI insights for reporting.
- Master insight engine endpoint to batch-generate insights.
- Frontend UI to review and edit AI outputs (`frontend/src/pages/AiInsight.jsx`, `frontend/src/pages/InvoiceDetail.jsx`).

## AI integration (what, where)

- Provider: Google Generative Language (Gemini) — client libraries present in `composer.json` (`google-gemini-php/*`) and vendor.
- Configuration: `config/gemini.php` and `config/services.php` read `GEMINI_API_KEY` from the environment.
- Prompts: templates live in the `prompts/` folder (e.g., `prompts/ai_ingredient_insights_prompt.txt`, `prompts/invoice_extraction_prompt.txt`).
- Controllers calling Gemini (examples):
	- `app/Http/Controllers/AiInsightController.php` — master insight engine and orchestration.
	- `app/Http/Controllers/IngredientController.php` — ingredient insight generation and caching.
	- `app/Http/Controllers/InvoiceController.php` — invoice extraction; populates `ai_extraction_data` on `Invoice`.
	- `app/Http/Controllers/SalesReconciliationController.php` — reconciliation helpers using Gemini.
- Models: `app/Models/AiInsight.php`, `app/Models/Invoice.php` (stores `ai_extraction_data`), and model relations that attach insights to suppliers, recipes and ingredients.

## AI workflow (how it works)

1. The controller composes a prompt using a template from `prompts/` and injects domain data (invoice text, ingredient details, etc.).
2. It calls Gemini endpoints (the code uses `generativelanguage.googleapis.com/...:generateContent` HTTP endpoints or the `google-gemini-php` client) with the API key configured via `GEMINI_API_KEY`.
3. The response is parsed and validated; structured outputs are persisted to models (`ai_extraction_data`, `ai_insights`, `AiInsight` records).
4. Frontend displays results where users can review and adjust fields; corrected outputs can be saved back into the database.

## Where the API key is stored

- Environment variable: `GEMINI_API_KEY` (read via `env('GEMINI_API_KEY')`). See `config/gemini.php` and `config/services.php` for usage.
- The repository contains `.env.example` and `.env` files. Ensure real secrets are never committed to Git. If present, rotate any exposed keys immediately.

## Quick setup (local)

1. Clone the repo and install PHP deps:

```bash
git clone <repo-url>
cd Happy_Hour
composer install
cp .env.example .env
php artisan key:generate
```

2. Configure `.env` (set `DB_*`, `GEMINI_API_KEY`, etc.), then run migrations:

```bash
php artisan migrate --seed
```

3. Frontend:

```bash
cd frontend
npm install
npm run dev
```

4. Serve backend (one option):

```bash
php artisan serve
```

## Security & operational recommendations

- Never commit real API keys; use environment secrets or secret managers in production.
- Restrict key permissions and enable billing/usage alerts on the Google Cloud project.
- Add request rate-limiting and retries with exponential backoff for external AI calls.
- Sanitize and validate AI responses before storing; log only non-sensitive metadata.

## Useful commands

- `composer install`, `php artisan migrate`, `php artisan db:seed`
- `npm install` and `npm run dev` (in `frontend/`)
- `./vendor/bin/phpunit` to run PHP tests

## Next steps you might want me to do

- List every file that references `GEMINI_API_KEY`.
- Show the `.env` line containing `GEMINI_API_KEY` locally (I won't print secrets without confirmation).
- Replace `.env` key usage with a secrets manager pattern.

---

If you want, I can now list the exact files/lines where `GEMINI_API_KEY` is read or show the `.env` entry after you confirm you want to view the secret.
"# Happy_Hour" 
