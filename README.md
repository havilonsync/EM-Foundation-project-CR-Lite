# CR-Lite — Continuity Receipts Demo

A minimal full-stack demo of the Continuity Receipts (CR) standard: queries are answered by Claude, confidence is scored across five dimensions, thresholds are evaluated per reliance level (RC-1 through RC-5), and every result is stored as a chained receipt in PostgreSQL.

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 15+**
- An **Anthropic API key** with access to Claude

## Local setup

### 1. Clone and create the database

```bash
git clone https://github.com/Shofol/cr-lite.git
cd cr-lite

createdb cr_lite
```

If you use a different database name or user, adjust the connection URL in the next step.

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_URL` | PostgreSQL connection URL, e.g. `postgresql://you@localhost:5432/cr_lite` |

### 3. Install backend dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The database table is created automatically on first backend startup via migrations.

### 4. Install frontend dependencies

```bash
cd ../frontend
cp .env.example .env.local
npm install
```

Edit `frontend/.env.local` and set `NEXT_PUBLIC_API_URL` if your backend is not on `http://localhost:8000`.

## Running the app

Start the backend (from `backend/`):

```bash
uvicorn main:app --reload
```

The API runs at [http://localhost:8000](http://localhost:8000).

Start the frontend (from `frontend/`, in a second terminal):

```bash
npm run dev
```

The UI runs at [http://localhost:3000](http://localhost:3000). Open the home page and follow the link to **Query** to submit a question.

## Running tests

### Unit tests (logic, no API/DB required)

```bash
cd backend
python3 -m unittest test_logic.py -v
```

### End-to-end tests (Milestone 1)

Requires a running PostgreSQL database, valid `.env`, and Anthropic API access. Calls the real Claude API twice.

```bash
cd backend
python3 test_e2e.py
```

The script prints `PASS`/`FAIL` for each check and a final summary:

- RC-1 query always passes
- RC-5 factual query fails (confidence rarely reaches 0.90)
- Receipts are saved with `chain_hash`
- The second receipt’s `chain_hash` differs from the first (chain integrity)

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/query` | Submit a query with a reliance level |
| `GET` | `/api/receipts` | Last 20 receipts |
| `GET` | `/api/stats` | Totals, pass/failure rates, avg confidence |

## Project structure

```
cr-lite/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── db.py             # PostgreSQL helpers
│   ├── logic.py          # CR threshold & chain logic
│   ├── claude_client.py  # Anthropic API client
│   ├── test_logic.py     # Unit tests
│   ├── test_e2e.py       # Milestone 1 E2E tests
│   └── migrations/       # SQL migrations
└── frontend/
    └── src/app/          # Next.js pages
```

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DATABASE_URL` | PostgreSQL connection URL |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins (e.g. `http://localhost:3000,https://your-app.vercel.app`) |

### Frontend (`frontend/.env.local`)

Copy from `frontend/.env.example`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL, no trailing slash (e.g. `http://localhost:8000` or your Railway URL) |

On **Vercel**, set `NEXT_PUBLIC_API_URL` in Project → Settings → Environment Variables, then redeploy.

On **Railway** (backend), set `CORS_ORIGINS` to include your Vercel URL (e.g. `https://cr-lite.vercel.app`).

Never commit `backend/.env` or `frontend/.env.local` — they are listed in `.gitignore`.
