# Developer Setup

## Prerequisites

- Node.js and npm
- Python 3
- A Supabase project for authenticated flows

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Run the frontend from the `frontend/` directory because that is where `package.json` lives.

## Backend

```bash
cd backend
python -m venv .venv
# activate the environment for your shell
pip install -r requirements.txt
python app.py
```

The Flask app exposes the backend locally on its configured port.

## Environment

Use local environment files for Supabase and API configuration. Do not commit real keys.

## Before opening a PR

```bash
cd frontend
npm run lint
npm run build
```

For backend changes, run the affected Flask route or service locally and include the test performed in the PR description.
