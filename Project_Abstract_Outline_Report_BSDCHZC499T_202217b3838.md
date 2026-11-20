# BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE, PILANI
## VIDYA VIHAR, PILANI, RAJASTHAN – 333031
### Work Integrated Learning Programmes Division

---

**DISSERTATION / PROJECT WORK OUTLINE**

**Academic Year 2026–2027**

---

| Field | Details |
|---|---|
| **Dissertation / Project Work Title** | RestoSync: A Multi-Tenant Real-Time Distributed Restaurant Operating and Point-of-Sale System |
| **Course No. & Course Title** | BSDCHZC499T : Dissertation |
| **Degree Programme** | BSc Design and Computing – HCL (17BH/17B2/17B3/17B4) |
| **Research Area** | Software Architectures |
| **Name of the Student** | Aryan Jain |
| **BITS ID No.** | 202217b3838 |
| **Student Email Address** | 202217b3838@wilp.bits-pilani.ac.in |
| **Name & Location of Employing Organization** | HCL Tech, Noida, Uttar Pradesh |
| **Semester / Date** | First Semester of Academic Year 2026–2027 |
| **Month & Year of Submission** | November 2026 |

---

<div style="page-break-after: always;"></div>

## STUDENT, SUPERVISOR & ADDITIONAL EXAMINER IDENTIFICATION

| Particulars | Details |
|---|---|
| **Student Name** | Aryan Jain |
| **BITS ID No.** | 202217b3838 |
| **Degree Programme** | BSc Design and Computing – HCL (17BH/17B2/17B3/17B4) |
| **Student Email** | 202217b3838@wilp.bits-pilani.ac.in |
| **Employing Organization** | HCL Tech, Noida, Uttar Pradesh |
| | |
| **Supervisor Name** | Venkata Siva Bala Prasad Dumpa |
| **Supervisor Qualification** | B.Tech. |
| **Supervisor Designation** | Managing Consultant II |
| **Supervisor Organization** | HCL Software, 3rd Floor, Tower 8, Sy. No 89/ORR Service Road, Opposite Babukhan Arena, Kokapet, Gandipet Mandal, Ranga Reddy District, Hyderabad, Telangana 500075 |
| **Supervisor Phone** | +91-9440533132 |
| **Supervisor Email** | venkatasivaba.dumpa@hcl-software.com |
| | |
| **Additional Examiner Name** | Rajasekhar Anand |
| **Additional Examiner Qualification** | M.C.A. |
| **Additional Examiner Designation** | Associate Director |
| **Additional Examiner Organization** | HCL Software, 3rd Floor, Tower 8, Sy. No 89/ORR Service Road, Opposite Babukhan Arena, Kokapet, Gandipet Mandal, Ranga Reddy District, Hyderabad, Telangana 500075 |
| **Additional Examiner Phone** | +91-8008266554 |
| **Additional Examiner Email** | rajasekhar.anand@hcl-software.com |

---

<div style="page-break-after: always;"></div>

## TABLE OF CONTENTS

| Section | Title | Page |
|---|---|---|
| 1 | Broad Area of Work | 4 |
| 2 | Background | 5 |
| 3 | Objectives | 6 |
| 4 | Scope of Work | 7 |
| 5 | Plan of Work | 8 |
| 6 | Literature References | 9 |
| 7 | Particulars of the Supervisor and Additional Examiner | 10 |
| 8 | Remarks of the Supervisor and Signature Block | 11 |

---

<div style="page-break-after: always;"></div>

## 1. BROAD AREA OF WORK

The broad area of this dissertation is **Software Architectures**, specifically the design and engineering of a **multi-tenant, real-time, distributed Software-as-a-Service (SaaS) platform** for the hospitality and food-service industry. The work, titled **RestoSync**, is a production-grade restaurant operating system and Point-of-Sale (POS) ecosystem that unifies billing, kitchen operations, floor and table management, inventory, finance, and a cloud-based SaaS administration console behind a single cohesive architecture.

The engineering effort spans four architecturally significant pillars, each realized directly in the implemented codebase:

### 1.1 Multi-Tenant SaaS Data Partitioning
RestoSync is engineered as a shared-infrastructure, logically-isolated multi-tenant system. Every business-domain entity derives from a common `BaseEntity` abstraction carrying mandatory `tenantId` and `outletId` discriminators, enforcing a *partition key on every document*. Persistence is implemented over **MongoDB** via `MongoDbContext`, exposing twenty-one strongly-typed collections (tenants, outlets, users, categories, menu items, orders, customers, tables, inventory, expenses, cash-flow entries, discounts, feedbacks, audit logs, plans, subscription invoices, announcements, platform coupons, platform settings, enquiries, and owner registration logs). Background-provisioned compound indexes keyed on `(tenantId, outletId, …)` keep tenant-scoped queries selective as collections scale across businesses, while `MongoRepository<T>` and the `[RequireSameTenant]` action filter enforce tenant boundaries on every query and mutation.

### 1.2 Distributed, Event-Driven Synchronization
Restaurant operations are inherently distributed: a single order flows from a billing desk or a waiter's handheld terminal to a kitchen display and floor plan in near real time. RestoSync models this as an **event-driven system** built on **ASP.NET Core SignalR** WebSocket hubs. The `OrderHub` (`/hubs/order`) validates JWT `tenantId` claims before admitting connections into tenant- and station-scoped broadcast groups — `outlet_{tenantId}_{outletId}` for billing and floor clients and `kds_{tenantId}_{outletId}` for kitchen stations. Domain events (`NewKOTReceived`, `ReceiveOrderUpdate`, `TableStatusChanged`, `OrderStatusChanged`, `TableListChanged`, `ReceiveAggregatorOrder`, `MenuItemAvailabilityChanged`, and `MenuCatalogUpdated`) are fan-out broadcast to subscribed clients without polling.

### 1.3 Offline-First Edge State Reconciliation
Point-of-sale terminals cannot stall during network interruptions in a billing rush. RestoSync adopts an **offline-first edge model**. The React client maintains local working state across seven Zustand stores (`posSyncStore`, `draftCartStore`, `tableStore`, `menuStore`, `receiptSettingsStore`, `authStore`, and `langStore`) persisted to `localStorage` under tenant-scoped keys so unsettled carts, in-flight KOTs, and sales ledgers survive reloads and transient disconnection. The SignalR client (`signalr.ts`) uses automatic reconnection with WebSockets-to-long-polling fallback, while the Electron wrapper extends resilience via an on-disk menu-catalog cache and thermal receipt spooler.

### 1.4 Cross-Platform Client Engineering
RestoSync is delivered across four heterogeneous client surfaces sharing one backend contract: a **.NET 8** Clean Architecture REST and WebSocket backend; a **React 19 + Vite + TypeScript** multi-portal web application; an **Expo (React Native, SDK 52)** mobile captain/waiter terminal; and an **Electron** desktop POS wrapper providing silent ESC/POS thermal printing and RJ11 cash-drawer control. Sharing authentication, tenancy, and real-time event contracts across web, mobile, and desktop runtimes forms the integrative architectural core of the project.

---

<div style="page-break-after: always;"></div>

## 2. BACKGROUND

Independent restaurants and multi-outlet chains in India overwhelmingly operate on legacy, single-tenant, locally-installed POS software. These systems were designed for isolated billing counters and exhibit well-understood architectural deficiencies that degrade severely under real operating load:

- **Rush-hour database locking.** Monolithic POS applications typically serialize billing, KOT generation, and reporting through a single relational data store with coarse-grained locks. During peak service, concurrent writes from multiple billing counters contend for the same rows, producing lock escalation, timeouts, and visibly frozen terminals precisely when throughput matters most.
- **Delayed and lost KOT routing.** In legacy deployments the kitchen receives orders through fragile serial-port printers or file-share polling. Without a deterministic, low-latency event channel between the billing desk and the kitchen, tickets arrive late, out of order, or not at all, extending preparation times and table turnaround.
- **Multi-outlet synchronization failure.** Chains running several outlets cannot obtain a consistent, consolidated view of menu, pricing, sales, and inventory because each outlet acts as an isolated data island. Menu changes, price revisions, and item-availability toggles must be re-entered manually at every location, reducing head-office reporting to overnight batch reconciliation.
- **No tenant isolation or SaaS operability.** Single-tenant desktop installs lack a central control plane for onboarding, metering, subscription billing, and feature governance across many independent businesses, rendering them uneconomical to operate as a cloud service.

RestoSync addresses each failure mode with a cloud-native, horizontally-scalable architecture: a document database with per-tenant partition keys and compound indexing to eliminate hot-row contention; a SignalR event mesh for deterministic KOT and table propagation; a shared multi-tenant data model giving multi-outlet chains a single source of truth; and a SuperAdmin SaaS console for tenant lifecycle, Razorpay subscription billing, and platform governance.

This problem domain aligns directly with the student's professional engineering environment at **HCL Tech**, where enterprise engagements routinely demand cloud-native software architecture, multi-tenant SaaS data partitioning, real-time distributed messaging, role-based access control, and cross-platform delivery. RestoSync thus serves both as a complete hospitality product and as a rigorous applied study of enterprise engineering practices.

---

<div style="page-break-after: always;"></div>

## 3. OBJECTIVES

The dissertation pursues the following concrete, measurable engineering objectives, each grounded in and verifiable against the implemented RestoSync codebase:

1. **Enforce verifiable multi-tenant data isolation.** Design and implement a shared-collection MongoDB data model in which every domain record is partitioned by `tenantId` and `outletId`, reinforced by `MongoRepository<T>`, `CurrentUserService`, and the `[RequireSameTenant]` action filter, and verify via an automated `xUnit` cross-tenant integration test suite (`CrossTenantAccessTests`) asserting `HTTP 403`/`404` on every cross-boundary access path.

2. **Achieve low-latency, real-time operational synchronization.** Implement ASP.NET Core SignalR WebSocket hubs (`OrderHub` at `/hubs/order`) that propagate KOT creation, repeat-KOT accumulation, order-status transitions, menu updates, and table-occupancy changes from any originating terminal to the Kitchen Display System and floor clients within sub-100-millisecond server-side fan-out using tenant- and station-scoped broadcast groups.

3. **Guarantee offline-resilient order continuity.** Engineer an offline-first client state layer (Zustand stores with tenant-scoped `localStorage` persistence, Electron on-disk menu caching and ESC/POS receipt spooling, and automatic SignalR reconnection with transport fallback) that preserves draft carts, unsettled KOTs, and the sales ledger across network loss and reload.

4. **Implement defence-in-depth, multi-role authentication and authorization.** Deliver HMAC-SHA256 JWT authentication carrying tenant, outlet, and permission claims, BCrypt password hashing (work factor 11), refresh-token rotation, and a four-digit PIN quick-login flow protected by `PinRateLimiter` (5-minute lockout after 5 failed attempts per outlet), across an eight-role RBAC model (`SuperAdmin`, `Owner`, `Cashier`, `KitchenStaff`, `DeliveryBoy`, `Waiter`, `Captain`, `Manager`).

5. **Operationalize the platform as a governed SaaS.** Build a SuperAdmin control plane for tenant onboarding, impersonation, subscription-plan and feature-toggle governance, Razorpay checkout with constant-time HMAC-SHA256 signature verification (`CryptographicOperations.FixedTimeEquals`), GST-compliant invoicing, announcements, coupons, and an audit-logging subsystem (`AuditLogService`).

6. **Deliver and integrate four cross-platform clients against one backend contract.** Implement and integrate the web POS and SuperAdmin portals, the Expo React Native mobile captain/waiter app (`PairDeviceScreen`, `LoginPinScreen`, `FloorPlanScreen`, `OrderPunchScreen` with `expo-secure-store` persistence), and the Electron desktop wrapper, all consuming unified REST and SignalR contracts.

---

<div style="page-break-after: always;"></div>

## 4. SCOPE OF WORK

The scope defines the independent engineering deliverables executed by the student across the RestoSync workspace:

### 4.1 Backend REST & Real-Time APIs (`src/`)
- A **.NET 8 Clean Architecture** solution of four projects — `RestoSync.Domain` (entities, `BaseEntity`, enums), `RestoSync.Application` (interfaces, DTOs, FluentValidation validators, exceptions), `RestoSync.Infrastructure` (`MongoDbContext`, `MongoRepository<T>`, `JwtService`, `BcryptPasswordHasher`, `PinRateLimiter`, `AuthService`, `RazorpayService`, `DbSeeder`), and `RestoSync.API` (`Program.cs`, controllers, SignalR hub, middleware, services).
- Eighteen controller source modules (housing twenty-two REST controllers) covering authentication, menu and bulk menu upload, orders and aggregator simulation, tables and customer CRM, inventory, finance and reports, Razorpay payments, plans, platform invoices/coupons/settings, announcements, audit logs, public landing endpoints, health diagnostics, and SuperAdmin analytics/enquiries/team management.
- The `OrderHub` SignalR hub (`/hubs/order`) with JWT query-string token extraction during WebSocket upgrade and tenant-verified group membership, complemented by `RequireSameTenantAttribute`, `GlobalExceptionMiddleware`, `CurrentUserService`, and `AuditLogService`.

### 4.2 MongoDB Multi-Tenant Data Modelling (`RestoSync.Infrastructure/Data/`)
- A `MongoDbContext` managing twenty-one tenant-partitioned collections with background compound indexes keyed on `(tenantId, outletId, …)` for users, outlets, categories, menu items, and orders, plus unique sparse indexes on plan codes, invoice numbers, and coupon codes.
- A deterministic `DbSeeder` provisioning baseline platform plans, settings, coupons, announcements, audit entries, and SuperAdmin credentials.

### 4.3 Web POS, Owner & SuperAdmin Portals (`client/`)
- A **React 19 + Vite + TypeScript** multi-portal application comprising the public landing/demo/registration pages, the operational POS workspace (Billing, KDS, Table Manager, Menu Manager, Operations, Finance, Reports, Online Orders, Receipt Settings), the Restaurant Owner portal (fourteen pages), and the SuperAdmin SaaS console (twenty-two pages).
- Client state management and offline resilience via seven Zustand stores, `SignalRService`, a 48mm–80mm live thermal receipt customizer with UPI QR support, and Excel menu bulk import/export (`menuExcelHelper.ts` via `xlsx`).

### 4.4 Mobile Waiter Application (`waiter-mobile/`)
- An **Expo SDK 52 / React Native 0.76** mobile captain terminal implementing outlet-code/QR device pairing (`PairDeviceScreen`), rate-limited 4-digit PIN authentication (`LoginPinScreen`), live SignalR-synced floor-plan management (`FloorPlanScreen`), and table-side KOT punching (`OrderPunchScreen`), backed by `expo-secure-store` persistence and automatic SignalR group re-subscription on reconnect.

### 4.5 Desktop POS Wrapper (`desktop-electron/`)
- An **Electron** desktop shell exposing a context-isolated IPC bridge (`preload.js` / `main.js`) for silent thermal printing, raw ESC/POS byte-stream spooling (`spooler/`), RJ11 cash-drawer kick pulsing, printer discovery, and on-disk offline menu-catalog caching (`cache/`).

### 4.6 Integration & Cross-Tenant Security Testing (`tests/`)
- An `xUnit` integration suite (`CrossTenantAccessTests`) with fifteen `[Fact]` test cases executing against `WebApplicationFactory<Program>` and an isolated `restosync_test` database, symmetrically verifying `403`/`404` rejection of cross-tenant requests and strict tenant scoping across tenants, outlets, categories, menu items, orders, and tables.

**Out of scope:** live production webhook certification with third-party food aggregators (Zomato/Swiggy) beyond simulated ingestion; public App Store/Play Store distribution; and cloud infrastructure provisioning (managed Kubernetes/CDN tiers), which are deployment concerns outside dissertation deliverables.

---

<div style="page-break-after: always;"></div>

## 5. PLAN OF WORK

| # | Milestone / Task | Start Date | End Date |
|---|---|---|---|
| 1 | Dissertation Outline, problem formulation, literature survey, and architecture baselining | 03 Nov 2026 | 23 Nov 2026 |
| 2 | System Architecture & Backend Core — Clean Architecture scaffolding, domain modelling, MongoDB multi-tenant context, JWT/PIN security, Razorpay billing, and SignalR hub | 24 Nov 2026 | 10 Jan 2027 |
| 3 | Web, Mobile & Desktop Client Engineering — POS/Billing, KDS, Table Management, Owner & SuperAdmin portals, Expo waiter app, and Electron ESC/POS wrapper | 11 Jan 2027 | 28 Feb 2027 |
| 4 | Integration & Cross-Tenant Security Testing — real-time synchronization validation, offline state reconciliation, and automated 15-case isolation test suite | 01 Mar 2027 | 21 Mar 2027 |
| 5 | Supervisor / Additional Examiner review, hardening, performance profiling, and incorporation of feedback | 22 Mar 2027 | 10 Apr 2027 |
| 6 | Final Dissertation Compilation and Submission | 11 Apr 2027 | 25 Apr 2027 |

---

<div style="page-break-after: always;"></div>

## 6. LITERATURE REFERENCES

[1] F. Chong, G. Carraro, and R. Wolter, "Multi-Tenant Data Architecture," *Microsoft Corporation — MSDN Architecture Center*, June 2006.

[2] M. Fowler, *Patterns of Enterprise Application Architecture*. Boston, MA, USA: Addison-Wesley Professional, 2002.

[3] A. S. Tanenbaum and M. van Steen, *Distributed Systems: Principles and Paradigms*, 3rd ed. London, UK: Pearson/CreateSpace, 2017.

[4] M. Kleppmann, *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. Sebastopol, CA, USA: O'Reilly Media, 2017.

[5] S. Newman, *Building Microservices: Designing Fine-Grained Systems*, 2nd ed. Sebastopol, CA, USA: O'Reilly Media, 2021.

[6] V. Vernon, *Implementing Domain-Driven Design*. Upper Saddle River, NJ, USA: Addison-Wesley Professional, 2013.

[7] R. T. Fielding, "Architectural Styles and the Design of Network-based Software Architectures," Ph.D. dissertation, Dept. Inf. and Comput. Sci., Univ. of California, Irvine, CA, USA, 2000.

[8] I. Fette and A. Melnikov, "The WebSocket Protocol," Internet Engineering Task Force (IETF), RFC 6455, Dec. 2011.

---

<div style="page-break-after: always;"></div>

## 7. PARTICULARS OF THE SUPERVISOR AND ADDITIONAL EXAMINER

| Particular | Supervisor | Additional Examiner |
|---|---|---|
| **Name** | Venkata Siva Bala Prasad Dumpa | Rajasekhar Anand |
| **Qualification** | B.Tech. | M.C.A. |
| **Designation** | Managing Consultant II | Associate Director |
| **Organization** | HCL Software | HCL Software |
| **Full Address** | 3rd Floor, Tower 8, Sy. No 89/ORR Service Road, Opposite Babukhan Arena, Kokapet, Gandipet Mandal, Ranga Reddy District, Hyderabad, Telangana 500075 | 3rd Floor, Tower 8, Sy. No 89/ORR Service Road, Opposite Babukhan Arena, Kokapet, Gandipet Mandal, Ranga Reddy District, Hyderabad, Telangana 500075 |
| **Phone (with STD code)** | +91-9440533132 | +91-8008266554 |
| **Email** | venkatasivaba.dumpa@hcl-software.com | rajasekhar.anand@hcl-software.com |

---

<div style="page-break-after: always;"></div>

## 8. REMARKS OF THE SUPERVISOR AND SIGNATURE BLOCK

### Remarks of the Supervisor

The proposed dissertation, *RestoSync: A Multi-Tenant Real-Time Distributed Restaurant Operating and Point-of-Sale System*, addresses a substantive and industrially relevant problem in cloud-native software architecture. The candidate has demonstrated a sound command of multi-tenant SaaS data partitioning, event-driven real-time synchronization using SignalR, offline-first client state reconciliation, and secure multi-role access control, and has translated these principles into a working, cross-platform implementation spanning a .NET 8 backend, React and React Native clients, and an Electron desktop wrapper. The objectives are concrete, measurable, and verifiable against an automated cross-tenant security test suite, and the scope is well bounded for independent execution within the dissertation period. The architectural rigour, engineering depth, and practical deployability of the work are commensurate with the standards of the programme. I endorse this outline and recommend it for approval.

<br/>

| | | |
|---|---|---|
| | | |
| **______________________** | **______________________** | **______________________** |
| **Signature of Student** | **Signature of Supervisor** | **Signature of Additional Examiner** |
| Name: Aryan Jain | Name: Venkata Siva Bala Prasad Dumpa | Name: Rajasekhar Anand |
| BITS ID: 202217b3838 | Designation: Managing Consultant II | Designation: Associate Director |
| Date: ____________ | Date: ____________ | Date: ____________ |

---

*Place: Hyderabad / Noida*  
*Date: November 2026*
