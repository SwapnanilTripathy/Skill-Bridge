# Skill-Bridge Architecture

## Overview

Skill-Bridge connects students, faculty, colleges, and recruiters through a React/Vite frontend and a Python/Flask backend.

## Application layers

- **Frontend** — React, React Router, Supabase client, role-based pages and layouts.
- **Authentication** — Supabase Auth plus the `profiles` role record.
- **Backend** — Flask API with route and service modules.
- **Data** — Supabase/Postgres tables for profiles, skills, resumes, opportunities, matches, and applications.

## Role flows

```text
Public
  ├── Landing
  ├── Login
  ├── Signup
  └── Role Selection

Authenticated
  ├── Student
  ├── Recruiter
  ├── College
  └── Faculty
```

## Request flow

```text
React page
   ↓
Supabase / Flask API
   ↓
Service or database layer
   ↓
Application state
   ↓
Role-specific UI
```

## Design principles

1. Keep role boundaries explicit.
2. Keep authentication and authorization separate.
3. Prefer focused changes over large cross-role refactors.
4. Never commit credentials or environment secrets.
