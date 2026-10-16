# ReportFlow

Multi-tenant SaaS for marketing agencies to run client reporting. Vite + React Router on Lovable Cloud (Supabase-compatible auth + Postgres + RLS). This is not a Bun/Next.js app — this platform does not support that layout.

## Is this industry-level?

The **product spec is the right foundation** (orgs, roles, RLS, invites, Stripe IDs). It is **not** a complete enterprise platform yet: no audit log, no 2FA, no invite emails (link copy), no Stripe checkout, no client/report modules.

This repo implements that foundation the way a production agency SaaS should start:

- Tenant isolation in Postgres (RLS + `security definer` helpers, not client-side filters)
- Atomic RPCs for create-org / invite / accept-invite
- Profile + optional domain auto-join on `auth.users` insert
- Session-aware marketing site, protected dashboard, public invite route
- Billing **table only** — checkout waits for the managed Stripe integration

## Setup

1. Copy `.env.example` to `.env.local` with Lovable Cloud URL + anon/publishable key.
2. Run `supabase/migrations/0001_reportflow_foundation.sql` in the Cloud SQL editor (or `supabase db push`).
3. Auth → enable **Email** and **Google**. Google needs the same-turn provider toggle in Lovable Cloud → Users (OAuth client is managed there; this repo cannot mint Google Cloud credentials).
4. Auth URL config: add `http://localhost:8080/**` and your production origin to redirect allow-list. Reset redirect: `/reset-password`.
5. `npm install` then `npm run dev` (port 8080).

## Routes

| Path | Access |
| --- | --- |
| `/` | Public landing |
| `/auth` | Sign in / sign up / forgot password |
| `/reset-password` | Recovery session |
| `/invite/:token` | Public; sign-in then join |
| `/onboarding` | Authenticated; create org |
| `/dashboard` | Org members (Clients / Reports placeholders, Team, Settings + Billing) |
