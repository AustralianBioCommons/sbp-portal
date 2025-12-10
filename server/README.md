# SBP Portal Backend Server

FastAPI backend for handling Seqera Platform workflow launches.

## Prerequisites

- Python 3.9+ (matching the version used by your deployment target)
- [uvicorn](https://www.uvicorn.org/) and other dependencies listed in `requirements.txt`

## Setup

1. Create a virtual environment (recommended):

   ```bash
   cd server
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your Seqera Platform credentials
   ```

4. Run the API locally:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
   # or: python -m app.main  (uses PORT/UVICORN_RELOAD variables)
   ```

## API Endpoints

- `GET /health` — Lightweight health probe
- `POST /api/workflows/launch` — Launch a Seqera workflow (send the same payload previously expected by the Express server)

## Environment Variables

Required entries in `.env`:

- `SEQERA_API_URL` — Seqera Platform API endpoint (e.g., `https://api.seqera.io`)
- `SEQERA_ACCESS_TOKEN` — API access token
- `COMPUTE_ID` — Default compute environment ID
- `WORK_DIR` — Default work directory
- `WORK_SPACE` — Seqera workspace identifier
- `PORT` — (Optional) uvicorn port when running `python -m app.main`
- `UVICORN_RELOAD` — (Optional) set to `true` to enable reload when running via `python -m app.main`

## Notes

- Requests fail fast with `500` if mandatory environment variables are missing.
- Downstream Seqera API failures surface as a `502` response with the original error message for easier debugging.
