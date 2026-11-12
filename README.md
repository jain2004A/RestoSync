# 🍽️ RestoSync POS

> **RestoSync: A Multi-Tenant Real-Time Distributed Restaurant Operating and Point-of-Sale System** — Enterprise POS, Billing Desk, Table Management, Kitchen Display System (KDS), Mobile Waiter App & Cloud SaaS Management Ecosystem.

---

## 🌟 Overview

**RestoSync** is an enterprise-grade restaurant management ecosystem engineered for high-volume dine-in restaurants, quick-service restaurants (QSR), cafes, bars, and cloud kitchens.

### Architecture Highlights
- **Backend**: .NET 8 Clean Architecture (Domain-Driven Design, MongoDB Persistence, SignalR Core, JWT Multi-Tenant Auth).
- **Web Applications**: React 19, TypeScript, Tailwind CSS, Vite, Zustand, TanStack Query.
- **Mobile Waiter App**: React Native with Expo SDK 52, touch-optimized quick PIN ordering pad.
- **Offline / Local POS**: Electron desktop wrapper supporting offline resilience, hardware thermal printing (ESC/POS), and cash drawer relays.
- **Kitchen Display System (KDS)**: Real-time SignalR order synchronization across billing desks, mobile waiters, and kitchen prep stations.

---

## 🏗️ Project Structure

```text
├── RestoSync.sln             # .NET 8 Backend Solution
├── src/                      # .NET 8 Clean Architecture backend solution
│   ├── RestoSync.API         # ASP.NET Core Web API & SignalR Hubs
│   ├── RestoSync.Application # CQRS, commands, queries, DTOs
│   ├── RestoSync.Domain      # Entities, enums, domain rules
│   └── RestoSync.Infrastructure # MongoDB repositories, seeding, persistence
├── tests/                    # Integration tests (RestoSync.IntegrationTests)
├── client/                   # React 19 Web Frontends (Billing, Tables, KDS, Admin)
├── waiter-mobile/            # Expo / React Native handheld waiter order-punching app
├── desktop-electron/         # Electron desktop app with native thermal printer support
├── billing/                  # Standalone billing portal entry point
├── kds/                      # Dedicated Kitchen Display System portal
├── owner/                    # Restaurant Owner analytics & management portal
├── superadmin/               # Multi-tenant SaaS platform admin portal
├── tables/                   # Table plan & visual floor layout management
├── docs/                     # Architectural blueprints, PRD & requirements
└── docker-compose.yml        # Containerized local environment (restosync-api, restosync-client)
```

---

## 🚀 Quick Start

### 1. Backend (.NET 8)
```bash
# Restore and run API
dotnet restore RestoSync.sln
dotnet run --project src/RestoSync.API
```

### 2. Web Frontend (React)
```bash
cd client
npm install
npm run dev
```

### 3. Handheld Waiter App (Expo / React Native)
```bash
cd waiter-mobile
npm install
npx expo start
```

### 4. Desktop Electron App
```bash
cd desktop-electron
npm install
npm start
```

---

## 📄 Documentation

Comprehensive system blueprints, PRD specifications, and architecture diagrams can be found in the [`docs/`](./docs) directory.

---

## 📜 License

Proprietary — All rights reserved by QuantroMind.
