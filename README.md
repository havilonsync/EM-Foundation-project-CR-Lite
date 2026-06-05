# CR-Lite — Continuity Receipts Demo

CR-Lite is a full-stack reference implementation of the [Continuity Receipts (CR) open standard](https://emfoundation.net) from the EM Foundation. It shows how an AI system can answer a question, score its own confidence across five dimensions, evaluate those scores against a chosen reliance level (RC-1 through RC-5), and persist every outcome as a cryptographically chained receipt in PostgreSQL.

Each query produces a structured result: either a **PASS** receipt with a formatted answer, provenance diagram, and nutrition-style confidence label, or a **FAILURE** receipt explaining which thresholds were not met and what action is required. On failure, the nutrition label and failure receipt are shown side by side.

Every receipt is cryptographically chained: each `chain_hash` is derived from the receipt contents plus the previous receipt's hash. The API exposes the full ancestor chain via `GET /api/receipts/{id}/chain` (oldest → newest), enabling tamper-evident audit trails.

The project is intentionally small and developer-friendly. The backend is a FastAPI service that calls Claude (Anthropic) for answers and confidence scoring; the frontend is a Next.js 14 app with pages for submitting queries, browsing receipts, and viewing aggregate stats.

**Live deployment:**

- Frontend: [https://em-foundation-project-cr-lite.vercel.app](https://em-foundation-project-cr-lite.vercel.app)
- Backend API: [https://em-foundation-project-cr-lite-production.up.railway.app](https://em-foundation-project-cr-lite-production.up.railway.app)
- API docs (Swagger): [https://em-foundation-project-cr-lite-production.up.railway.app/docs](https://em-foundation-project-cr-lite-production.up.railway.app/docs)

## Prerequisites

Install these before you begin:

| Tool | Version |
|------|---------|
| **Python** | 3.11.x or 3.12.x |
| **Node.js** | 20.x LTS (18.17+ also works) |
| **npm** | 10.x (bundled with Node 20) |
| **PostgreSQL** | 15.x or 16.x |
| **Anthropic API key** | Access to Claude via the Anthropic API |

Pinned frontend versions (from `frontend/package.json`):

- **Next.js** 14.2.35
- **React** 18.3.x
- **TypeScript** 5.x

Backend Python packages are listed in `backend/requirements.txt` (`fastapi`, `uvicorn`, `anthropic`, `psycopg2-binary`, `python-dotenv`, `pydantic`).

## Local setup from scratch

### 1. Clone the repository

```bash
git clone https://github.com/Shofol/cr-lite.git
cd cr-lite
```

### 2. Create a PostgreSQL database

```bash
createdb cr_lite
```

If you use a custom user, host, or port, note the connection details — you will need them for `DATABASE_URL`.

### 3. Configure backend environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum:

- `ANTHROPIC_API_KEY` — your Anthropic API key
- `DATABASE_URL` — e.g. `postgresql://localhost:5432/cr_lite` or `postgresql://you@localhost:5432/cr_lite`

`CORS_ORIGINS` can stay as `http://localhost:3000` for local development.

### 4. Install and prepare the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The database schema is applied automatically on first startup (`001_create_receipts.sql` runs via `run_migrations()`).

### 5. Configure frontend environment variables

```bash
cd ../frontend
cp .env.example .env.local
```

For local development, the default is fine:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 6. Install frontend dependencies

```bash
npm install
```

You are ready to run the app.

## Running the backend

From `backend/` with your virtual environment activated:

```bash
uvicorn main:app --reload
```

The API starts at [http://localhost:8000](http://localhost:8000).

Useful endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (`status`, `db`) |
| `POST` | `/api/query` | Submit a query with a reliance level |
| `GET` | `/api/receipts` | Paginated receipt list |
| `GET` | `/api/receipts/{id}` | Single receipt with enriched fields |
| `GET` | `/api/receipts/{id}/chain` | Ancestor chain for a receipt |
| `GET` | `/api/stats` | Totals, pass/failure rates, avg confidence |

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Running the frontend

In a second terminal, from `frontend/`:

```bash
npm run dev
```

The UI starts at [http://localhost:3000](http://localhost:3000).

Pages:

| Path | Description |
|------|-------------|
| `/` | Home — overview of Continuity Receipts and reliance levels |
| `/query` | Submit a query and view the result |
| `/receipts` | Browse saved receipts |
| `/receipts/{id}` | Receipt detail — query, answer (PASS), provenance diagram, nutrition label, and failure receipt (FAILURE) |
| `/stats` | Aggregate statistics dashboard (same header/footer as other pages) |
| `/stats/embed` | Compact stats view for iframe embeds (no nav; iframe-friendly) |

## Running tests

All test commands assume you are in `backend/` with the virtual environment activated.

### Unit tests (logic only — no API, DB, or Claude required)

```bash
python3 -m unittest test_logic.py -v
```

Covers threshold evaluation, aggregate scoring, chain hashing, failure reasons, and response enrichment.

### API tests (mocked — no live DB or Claude required)

```bash
python3 -m unittest test_api.py -v
```

Covers HTTP status codes, validation errors, chain endpoint behavior, and error handling via FastAPI's `TestClient`.

### Run all backend tests (except E2E)

```bash
python3 -m unittest test_logic.py test_api.py -v
```

### End-to-end tests (live DB + Claude API)

Requires a running PostgreSQL instance, valid `backend/.env`, and Anthropic API access. Makes real Claude API calls.

```bash
python3 test_e2e.py
```

Checks include RC-1 pass behavior, RC-5 failure behavior, receipt persistence, and chain hash integrity between consecutive receipts.

## Deploying to Railway (backend)

Railway hosts the FastAPI API and PostgreSQL database.

### 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project.
2. Add a **PostgreSQL** service. Railway sets `DATABASE_URL` automatically on services in the same project.

### 2. Deploy the backend service

1. Add a new service from your GitHub repo (or deploy via Railway CLI).
2. Set the **root directory** to `backend`.
3. Set the **start command**:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. Railway injects `PORT` automatically — do not hardcode it.

### 3. Set backend environment variables

In the backend service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_URL` | Reference the PostgreSQL service variable, or paste the connection URL |
| `CORS_ORIGINS` | `https://em-foundation-project-cr-lite.vercel.app` |
| `FRONTEND_URL` | `https://em-foundation-project-cr-lite.vercel.app` (also added to the CORS allowlist) |

### 4. Verify deployment

Open [https://em-foundation-project-cr-lite-production.up.railway.app/health](https://em-foundation-project-cr-lite-production.up.railway.app/health) — you should see:

```json
{"status": "ok", "db": "connected"}
```

Copy the Railway service URL; the frontend needs it as `NEXT_PUBLIC_API_URL`.

## Deploying to Vercel (frontend)

Vercel hosts the Next.js frontend.

### 1. Import the repository

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import the `cr-lite` GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Framework preset should auto-detect **Next.js**.

### 2. Set frontend environment variables

In Project → **Settings** → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://em-foundation-project-cr-lite-production.up.railway.app` (no trailing slash) |

Apply to Production (and Preview if you want preview deployments to hit a real API).

### 3. Deploy

Click **Deploy**. Vercel runs `npm run build` and serves the app.

### 4. Update backend CORS

After you know the Vercel URL, set `CORS_ORIGINS` and `FRONTEND_URL` on Railway to that URL, then redeploy the backend if needed.

### 5. Stats embed (optional)

The compact stats widget at `/stats/embed` is iframe-friendly. CSP `frame-ancestors *` is set in `frontend/next.config.mjs` for that route only.

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`. Never commit `.env` to git.

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key used by `claude_client.py` to call Claude. Without this, `/api/query` returns 503. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/cr_lite`). Used for all receipt storage and stats. |
| `CORS_ORIGINS` | No | Comma-separated list of allowed browser origins for cross-origin API requests. Defaults to `http://localhost:3000` if unset. Include every frontend URL that will call the API (local and production). |
| `FRONTEND_URL` | No | Deployed frontend URL, also merged into the CORS allowlist. Convenient single variable for production — set to your Vercel URL. Can be comma-separated for multiple deployments. |

`CORS_ORIGINS` and `FRONTEND_URL` are combined and deduplicated in `main.py` via `get_cors_origins()`.

### Frontend (`frontend/.env.local`)

Copy from `frontend/.env.example`. Never commit `.env.local` to git.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Base URL of the FastAPI backend, **without** a trailing slash. Defaults to `http://localhost:8000` if unset. Must be set in production to your Railway URL. Exposed to the browser (the `NEXT_PUBLIC_` prefix means it is inlined at build time). |

## Project structure

```
cr-lite/
├── backend/
│   ├── main.py              # FastAPI app and routes
│   ├── db.py                # PostgreSQL helpers, migrations, chain lookup
│   ├── logic.py             # CR threshold, chain hash, and enrichment logic
│   ├── claude_client.py     # Anthropic API client
│   ├── test_logic.py        # Unit tests
│   ├── test_api.py          # API tests (mocked)
│   ├── test_e2e.py          # End-to-end tests (live API)
│   └── migrations/          # SQL schema
└── frontend/
    └── src/
        ├── app/
        │   ├── (main)/        # Pages with Header + Footer (home, query, receipts, stats)
        │   └── stats/embed/   # Minimal layout for iframe embeds
        ├── components/
        │   ├── NutritionLabel.tsx    # PASS/FAIL confidence label
        │   ├── FailureReceipt.tsx    # Threshold failure breakdown
        │   ├── Provenancediagram.tsx # Query → retrieval → confidence → receipt flow
        │   ├── AnswerText.tsx        # Formatted answer rendering
        │   ├── StatsDashboard.tsx    # Stats tables and metrics
        │   ├── Header.tsx / Footer.tsx
        └── lib/             # API helpers, receipt types, RC level config
```

`.env` files are gitignored at the repo root and in `backend/` and `frontend/` — use the `.env.example` files as templates only.

## Continuity Receipts standard

CR-Lite implements the Continuity Receipts open standard published by the EM Foundation. The standard defines how AI systems should score confidence, evaluate reliance thresholds, and emit auditable receipts for every query.

**Standard and documentation:** [emfoundation.net](https://emfoundation.net)

## License

MIT License — see repository license file for details.
