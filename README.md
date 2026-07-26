# Innovation ERP — V0.1

Internal organization operations platform for Nazzal Business Systems.

Innovation ERP is **organization-side only**: inventory, procurement, sales, finance, accounting, HR, CRM, projects, support, documents, knowledge, and employee self-service — used by internal users.

There is **no customer portal** and **no vendor portal**. Customers and vendors are internal master data under Sales and Procurement.

Guide Tour and Demo Mode (interactive tour / demo-control panel) have been **removed**. Seeded demo organization data and optional demo quick-login on the login page remain for evaluation environments.

---



## Product overview

V0.1 delivers a multi-tenant SaaS foundation (organization-scoped users, roles, permissions, JWT auth) plus operational modules with entity workspaces, global search, notifications, presence, and reports.

### Active internal-user roles


| Role              | Typical access                                                    |
| ----------------- | ----------------------------------------------------------------- |
| CEO / Owner       | Executive dashboard and broad cross-module access                 |
| Finance Manager   | Accounting, finance, related reports                              |
| Inventory Manager | Inventory, operations stock flows                                 |
| Sales Manager     | Sales, CRM, related finance visibility as permitted               |
| HR Manager        | HR, payroll, leave, attendance                                    |
| Branch Manager    | Branch-scoped operational access                                  |
| Regular Employee  | My Workspace (self-service profile, leave, attendance, documents) |




### Current modules

- Executive dashboard
- Accounting (chart of accounts, journals, trial balance)
- Finance (customer invoices/payments, vendor bills/payments, AR/AP aging)
- Operations (goods receipts, deliveries)
- Inventory (products, warehouses, movements, reservations, transfers)
- Sales (customers, sales orders)
- Procurement (vendors, purchase orders)
- CRM (leads, opportunities, activities)
- Projects (projects, tasks, milestones)
- Support (tickets, categories)
- Documents & Knowledge
- HR (employees, departments, positions, attendance, leave, payroll, contracts, documents)
- Employee self-service (My Workspace)
- Reports
- Settings, profile, appearance, notifications, global search
- Online / away / offline presence and avatars

---



## Architecture

```
innovation-ERP/
├── apps/
│   ├── api/          Express + Prisma + PostgreSQL (default port 4010)
│   └── web/          Next.js App Router (default port 3010)
├── packages/
│   └── shared/       Shared types, constants, utilities
└── docs/             Data-accuracy notes, deployment runbook, architecture notes
```



---

