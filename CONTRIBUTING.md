Contributing Guidelines

Branching and PRs

- Do not commit directly to `main`.
- Create a feature branch for every change and open a Pull Request.
- Keep PRs small and focused; link the related issue (e.g., “Fixes #123”).

Code Quality

- Run tests and lint locally (`npm test`, `npm run lint`).
- Follow existing code style and patterns.
- Include screenshots/GIFs for UI changes.

Database Migrations

- Prefer additive migrations and backwards-compatible changes.
- Include a short note in the PR about migration impact and rollback.

Security & Privacy

- Avoid exposing secrets/logging sensitive data.
- Consider abuse/spam vectors for new endpoints and background tasks.

Release

- PR titles should be concise, imperative, and scoped.
- Use the PR template checklist before merging.
