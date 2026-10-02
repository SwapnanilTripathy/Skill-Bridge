# Skill-Bridge

Skill-Bridge is a digital platform designed to connect students with relevant career opportunities by combining student profiles, skill information, resume data, and opportunity matching.

## Project structure

```text
Skill-Bridge/
├── backend/        # Python API, routes, models, and matching services
├── frontend/       # React/Vite web application
├── CONTRIBUTING.md # Contribution guidelines
└── .github/        # Repository contribution templates
```

## Main areas

- **Student profile** — manage career interests and skills.
- **Resume processing** — extract useful information from uploaded resumes.
- **Skill analysis** — identify skills and potential gaps.
- **Opportunity matching** — connect students with relevant opportunities.
- **Recruiter and college workflows** — support opportunity and institution data.

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

Create and activate a Python virtual environment, install the dependencies, and start the API from the `backend/` directory.

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Check the frontend and backend configuration before running them together, especially any API base URL or environment variables required by the application.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow, pull request expectations, and bug-report guidance.

## Status

Skill-Bridge is an actively developed project. Features and architecture may evolve as matching, resume analysis, and career workflows are expanded.
