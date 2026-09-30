# Groupify

Groupify turns any list into fair, balanced groups in seconds, for classrooms, workshops, teams and events. Paste names or collect them with a shareable form, set rules, tweak the result, then export, print or publish it.

![Groupify Overview](./public/logo.webp)

## Features

**Making groups**
- Group by size or by number of groups; spread leftovers evenly or put them in a smaller group.
- **Rules**: keep chosen people together, keep others apart, and spread a tag or form answer (skill level, year group, …) evenly. Rules that can't be met are reported, not hidden.
- Rename groups, move people between them, undo, reshuffle. The quick tool remembers your list and your last eight groupings on the device.
- Grouping runs in a Web Worker so large lists never freeze the page.

**Forms**
- Build a sign-up form (text, number, dropdown, single choice, checkboxes) from a template or from scratch. No account needed to create or fill one.
- Responses table with search and sorting; export responses to Excel/Word with column and row filters.
- Generate groups straight from responses, then **publish** them so respondents can look up their own group.
- Duplicate a form for next term; save an anonymous form to an account.

**Sharing and access**
- Owners can invite collaborators by email (token invitation, 7-day expiry). Collaborators can work with responses and edit the form; only owners can delete it, rotate its link or manage people.
- Export groups to Excel (`xlsx`) and Word (`docx`), copy as text, or print (dedicated print styles).
- Email/password and Google sign-in via NextAuth.

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router) and React 19, TypeScript
- Tailwind CSS 3, Radix UI primitives, Remix Icon
- MongoDB (native driver) with NextAuth's MongoDB adapter
- Resend + React Email for invitations (optional)
- Vitest for tests

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in the values
pnpm dev               # http://localhost:3000
```

The only required settings are `MONGODB_URI`, `NEXTAUTH_SECRET` and `NEXTAUTH_URL`. Google sign-in, email and donations are optional; see [`.env.example`](./.env.example). Use `pnpm` (that's what `pnpm-lock.yaml` is for).

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm test` | Unit and route tests (Vitest) |
| `npx tsx scripts/ensure-indexes.ts` | Create the MongoDB indexes (the app also creates them on connect) |

## How access works

Understanding this makes the API routes easy to read. Everything goes through [`lib/form-access.ts`](./lib/form-access.ts):

| Role | Who | Can |
| --- | --- | --- |
| **owner** | The signed-in creator, or anyone holding the form's admin token | Everything, including delete, rotate link, manage collaborators |
| **collaborator** | An accepted invitee (matched by email, case-insensitively) | View/delete responses, edit the form, open/close it, publish groups |

- Forms created while signed out have no `userId`; the **admin token** in their admin link is the only credential. It is sent in an `X-Admin-Token` header (the old `?token=` query parameter is still accepted) and compared in constant time. Signed-in owners and collaborators never receive it.
- **Email verification.** Anyone can type any address into the signup form, so an email/password account's email grants nothing until it is confirmed: an unverified account can't match a collaborator entry, accept an invite, or see forms shared with its address (it still manages forms it owns, which are tied to the account). Confirmation uses a random, single-use, 24-hour token that is stored hashed and consumed by `POST /api/auth/verify` (a POST so mail scanners that pre-fetch links can't spend it). Google users count as verified. It is enabled whenever `RESEND_API_KEY` is set and switched off otherwise, since it couldn't be completed. Existing email/password accounts predate the flag and are asked to confirm on their next visit.
- **Google and an existing email/password account.** Signing in with Google as an address that already has an email/password account links to it. If that account never confirmed its address, it may have been registered by someone else, so Google's sign-in takes it over: the password is removed and any session started earlier is voided (`claimUnprovenAccount` in [`lib/verification.ts`](./lib/verification.ts), called from `lib/auth.ts`). An account that did confirm its address keeps its password and is simply linked.
- Public endpoints validate every submission against the form's own field definitions, cap payload size, and are rate limited with a MongoDB-backed counter (`rate_limits`, TTL-expired) so limits hold across serverless instances. It fails open if the database is unreachable.

## Project structure

- `app/`: routes. `app/api/` holds the JSON API; `app/forms/[formId]/{admin,edit,groups}` are the form pages.
- `components/groupify/`: feature components (quick tool, form builder, dashboard, results, rules).
- `lib/grouping.ts`: the grouping engine. Pure, seedable and shared by the browser, the worker and the tests.
- `lib/validation.ts`, `lib/form-access.ts`, `lib/rate-limit.ts`, `lib/db.ts`, `lib/models.ts`: validation, access control, rate limiting and typed collections.
- `tests/`: unit tests plus route-level tests that run the real handlers against an in-memory database (`tests/helpers/fake-db.ts`).
- `scripts/`: one-off maintenance scripts.

## Testing

`pnpm test` runs the whole suite; it needs no database. It covers the grouping engine (including a regression check of group sizes against the previous implementation), validation, rate limiting, redirect safety, and the access-control matrix for every API route.

## License

This project is private and intended for internal or authorized use only.
