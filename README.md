# ReportFlow

> **Automated client reporting for marketing agencies.**

ReportFlow is a multi-tenant SaaS platform designed for marketing agencies to manage organizations, teams, clients, and automated reporting from a single workspace.

The project focuses on building a secure, scalable SaaS foundation with organization-level isolation, role-based access control, authentication, team invitations, and billing infrastructure.

## ✨ Features

### 🔐 Authentication

* Email/password sign up and sign in
* Google authentication
* Forgot/reset password flow
* Automatic user profile creation
* Protected application routes

### 🏢 Multi-Tenant Organizations

* Create and manage organizations
* Organization switcher
* Roles: `owner`, `admin`, `member`
* Organization-based data isolation
* Row-Level Security (RLS)
* Invite teammates by email
* Token-based invitation acceptance

### 📊 Dashboard

* Protected dashboard
* Clients section
* Reports section
* Team management
* Organization settings
* Organization switching

### 👥 Team Management

* View organization members
* Manage member roles
* Send invitations
* Track pending invitations

### 💳 Billing Foundation

* Organization-level subscriptions
* Plans:

  * Free
  * Agency
  * Enterprise
* Subscription status tracking
* Stripe-ready architecture
* Checkout and webhook integration planned

## 🏗️ Architecture

```text
┌──────────────────────┐
│      Landing Page    │
│          /           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Authentication     │
│ /auth /reset-password│
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────┐
│      Organization Layer     │
│ Organizations / Members     │
│ Roles / Invites / Profiles  │
│            + RLS            │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│         Dashboard           │
│ Clients / Reports / Team    │
│ Settings / Billing          │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│       Reporting Engine      │
│   Planned / Future Feature  │
└─────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer          | Technology                         |
| -------------- | ---------------------------------- |
| Frontend       | React                              |
| Framework      | Lovable full-stack React framework |
| Cloud          | Lovable Cloud                      |
| Database       | PostgreSQL                         |
| Authentication | Managed Auth                       |
| Authorization  | Row-Level Security                 |
| Billing        | Stripe                             |
| Styling        | CSS / Semantic Design Tokens       |

## 🔒 Security

ReportFlow is designed around organization-level isolation.

Every organization-scoped resource is protected using database-level **Row-Level Security (RLS)** so that users can only access data belonging to organizations they are members of.

Roles:

```text
Owner
 ├── Full organization control
 │
Admin
 ├── Organization management
 │
Member
 └── Standard organization access
```

## 📁 Core Data Model

```text
profiles
    │
    ▼
organization_members ─────► organizations
    │                            │
    │                            ├── invites
    │                            │
    │                            └── subscriptions
    │
    └── user roles
```

Core tables:

```text
profiles
organizations
organization_members
invites
subscriptions
```

## 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/manosh-code/ReportFlow.git
cd ReportFlow
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create the required environment variables according to your Lovable Cloud configuration.

## 🧪 Development

The application is structured to support the next stage of development, including:

* Client management
* Automated report generation
* Marketing platform integrations
* Report scheduling
* Analytics dashboards
* Client-facing report portals
* Stripe subscriptions and webhooks

## 🗺️ Roadmap

### Phase 1 — Core Foundation

* [x] Landing page
* [x] Authentication
* [x] Organizations
* [x] Organization roles
* [x] Row-Level Security
* [x] Team invitations
* [x] Dashboard shell
* [x] Organization settings
* [x] Billing data model

### Phase 2 — Reporting

* [ ] Client management
* [ ] Report creation
* [ ] Report templates
* [ ] Automated report generation
* [ ] Scheduled reports
* [ ] PDF/export support

### Phase 3 — Integrations

* [ ] Google Analytics
* [ ] Google Ads
* [ ] Meta Ads
* [ ] Search Console
* [ ] Social media integrations

### Phase 4 — Billing

* [ ] Stripe Checkout
* [ ] Subscription management
* [ ] Stripe webhooks
* [ ] Usage-based limits
* [ ] Plan upgrades/downgrades

## 🎨 Design

ReportFlow uses a dark editorial SaaS aesthetic built around:

* Deep ink backgrounds
* Warm paper surfaces
* Amber highlights
* Serif display typography
* Clean sans-serif body text
* Semantic design tokens

The goal is to provide an agency-focused interface that feels professional, editorial, and premium without relying on generic purple-gradient SaaS styling.

## 🤝 Contributing

Contributions, ideas, and improvements are welcome.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

Then open a pull request.

## 📄 License

This project is currently private/proprietary unless otherwise specified.

---

Built for modern marketing agencies with a scalable SaaS architecture in mind.
