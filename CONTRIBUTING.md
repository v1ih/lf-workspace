# Contributing

## Workflow

1. Pick a ticket in **My Work** (e.g. `LF-011`) and press **Start working**.
2. Create a branch named after the ticket:
   ```bash
   git checkout -b feat/LF-011-vet-pass-validation
   ```
3. Commit in small steps using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `refactor:` code change that neither fixes a bug nor adds a feature
   - `test:` tests only
   - `docs:` documentation only
   - `chore:` tooling, dependencies
4. Before opening a PR:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
5. Open a Pull Request, paste the link in the ticket and press **Submit for review**.
6. After the review is approved, merge and move the ticket to **Done**.

## Database changes

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name short_description`
3. Commit the schema **and** the generated folder in `prisma/migrations/`.

## Code conventions

- Reads happen in Server Components; writes happen in Server Actions under `src/actions/`.
- Every Server Action starts with `requireUserId()` and filters queries by `userId`.
- Validate input with Zod. Return `ActionState` (`{ ok }` or `{ error }`), don't throw for user errors.
- Pure rules (no database) live in `src/lib/` and get a unit test in `tests/`.
- UI text is in English.
