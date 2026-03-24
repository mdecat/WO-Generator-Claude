# GBB Work Order Generator Claude
### Enterprise Bulk Work Order Generator for Dynamics 365 Field Service

A modern React SPA that generates Dynamics 365 Field Service Work Orders in bulk from a selected Incident Type, designed primarily for **demo data generation** in a controlled, intentional way.

> **Primary deployment target:** Dynamics 365 Web Resource — no Azure AD setup required. Authentication is handled by the existing D365 session.

---

## Architecture Overview

```
React 18 SPA (Vite + TypeScript)
  ├── MSAL.js v3      → Azure AD authentication (multi-tenant)
  ├── Fluent UI v9    → Microsoft design system
  ├── TanStack Query  → Dataverse API caching
  ├── Zustand v5      → Wizard state management
  ├── Leaflet.js      → Map-based account selection (polygon drawing)
  └── Turf.js         → Point-in-polygon geospatial operations

Power Platform Solution: "GBB WO Generator Claude"
  └── gbbwogeneratorclaude.zip → Importable into any D365 FS org
```

---

## Features

| Feature | Description |
|---|---|
| **Multi-Environment Support** | Discover all Dataverse environments in your tenant, or enter URL manually |
| **Incident Type Browser** | Search and select any `msdyn_incidenttype`, view full details (skills, tasks, products, duration) |
| **Query Builder** | Advanced Find-style filter builder with support for name, city, state, postal code, country |
| **Map Selection** | Display accounts on OpenStreetMap, draw polygons/rectangles to select by geography |
| **WO Parameters** | Work Order Type, Priority (fixed or randomized), date range, time window, count, distribution mode |
| **Preview & Plan** | See full distribution plan before executing (account, date, priority per WO) |
| **Bulk Generation** | Parallel batch creation with per-WO error handling and retry logic |
| **Error Resilience** | Price list auto-fallback, partial success, full error log per account |
| **Results Export** | CSV export of all results including WO numbers and error details |
| **Direct Deep Links** | Open each created WO in D365 directly from the results table |

---

## Installation

### Option A — Power Platform Web Resource (Primary, Recommended)

**No Azure AD registration needed.** The app runs inside D365 and uses the existing user session.

#### Quickest path: download the pre-built ZIP

1. Go to the [**Releases**](https://github.com/mdecat/WO-Generator-Claude/releases/latest) page and download `gbbwogeneratorclaude_v1_0_0_0.zip`
2. Go to [make.powerapps.com](https://make.powerapps.com) → select your target environment
3. **Solutions → Import → Browse** → upload the ZIP → follow the wizard
4. After import: **Solutions → GBB WO Generator Claude → Web Resources**
5. Open `gbb_wogenerator/index.html` → **Preview** (or add to the D365 sitemap)

When opened from D365, the app auto-detects the org URL from the active session and skips the login screen entirely. Users can switch to any other org on the same tenant via the **Switch Environment** option in the header.

#### Build from source

Requires Node.js 18+ and Python 3:

```bash
git clone https://github.com/mdecat/WO-Generator-Claude.git
cd WO-Generator-Claude
npm install
node scripts/build-release.mjs
```

This produces `gbbwogeneratorclaude_v1_0_0_0.zip` — import it the same way as above.

---

### Option B — Standalone (Dev / testing without D365)

Requires an Azure AD App Registration.

**1. Create App Registration:**
- Platform: SPA, Redirect: `http://localhost:5173`
- API Permissions: Dynamics CRM → `user_impersonation` (delegated) → Grant admin consent

**2. Configure:**
```bash
cp .env.example .env
# Edit .env with your VITE_MSAL_CLIENT_ID
```

**3. Run:**
```bash
npm install && npm run dev
```

---

## Wizard Flow

```
[0] Environment Selection
    ↓  Discover tenant environments OR enter org URL manually
[1] Incident Type Selection
    ↓  Browse and select msdyn_incidenttype, view full details
[2] Service Account Targeting
    ↓  Query Builder (Advanced Find-style) OR Map Selection (polygon draw)
[3] Work Order Parameters
    ↓  WO Type, Priority mode, date range, count, distribution
[4] Preview & Confirm
    ↓  Review distribution plan (account + date + priority per WO)
[5] Results
    ↓  Live progress, per-WO success/failure, CSV export
```

---

## Work Order Generation Logic

- **Account → WO mapping**: If `targetCount > accounts.length`, accounts are reused in random round-robin
- **Date distribution**: Random spread OR even spread across the date range
- **Priority**: Fixed (from dropdown) OR randomized from all available `msdyn_priority` records
- **Batch processing**: 5 concurrent WOs per chunk for reliable throughput
- **Error handling**:
  - Missing price list → auto-fetches default org price list and retries
  - Other failures → logged with HTTP code + message, processing continues
  - Results accessible after run completes

### Dataverse Fields Set Per Work Order

| Field | Source |
|---|---|
| `msdyn_serviceaccount` | Selected account |
| `msdyn_workordertype` | User selection |
| `msdyn_primaryincidenttype` | Selected incident type |
| `msdyn_priority` | User selection or random |
| `msdyn_timefrompromised` | Scheduled date at configured start hour |
| `msdyn_timetopromised` | Scheduled date at configured end hour |
| `msdyn_systemstatus` | `690970000` (Open – Unscheduled) |
| `msdyn_pricelist` | Account's price list → fallback to org default |

> D365 Field Service automatically populates Service Tasks, Products, and Characteristics from the Incident Type upon WO creation.

---

## Solution Packaging (Power Platform)

Build and package into an importable solution:

```bash
npm run build:solution
```

This produces `gbbwogeneratorclaude_YYYYMMDD_HHMMSS.zip` ready to import via:
- [Power Apps Maker Portal](https://make.powerapps.com) → Solutions → Import
- [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction): `pac solution import`

**Solution Identity:**
| Property | Value |
|---|---|
| Unique Name | `gbbwogeneratorclaude` |
| Display Name | `GBB WO Generator Claude` |
| Publisher | GBB (prefix: `gbb`) |
| Version | 1.0.0.0 |

---

## Deployment Options

### Option A: Local Development
```bash
npm run dev
```

### Option B: Azure Static Web Apps
1. `npm run build`
2. Deploy `dist/` to Azure Static Web Apps
3. Add the production URL as a redirect URI in Azure AD App Registration

### Option C: Power Platform Web Resource
```bash
npm run build:solution
# Import the generated .zip into your org
```

---

## Production Notes

- The app reads `VITE_DEFAULT_ORG_URL` as the default environment, but users can change it at runtime via the Environment step
- All API calls use the user's delegated identity (no service account / secrets)
- Only accounts with non-null `address1_latitude` AND `address1_longitude` are queried — this is enforced at the OData filter level
- For large batches (>200 WOs), the browser session must remain open

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_MSAL_CLIENT_ID` | ✅ | — | Azure AD App Registration Client ID |
| `VITE_MSAL_TENANT_ID` | — | `common` | Azure AD Tenant ID (or `common` for multi-tenant) |
| `VITE_DEFAULT_ORG_URL` | — | _(blank)_ | Pre-fill the org URL in standalone mode. Not needed for web resource deployments — org URL is auto-detected from the D365 session. |

---

## Extensibility

The WO creation logic in `src/api/workOrderApi.ts` → `createWorkOrder()` is designed to be reusable. The same input schema can be consumed by:

- **Power Automate**: Use the Dataverse connector with the same field mappings
- **Canvas App**: Expose via a custom connector
- **Plugin**: Port `buildDistributionPlan()` + `createWorkOrder()` to C#

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Auth | MSAL.js v3 (`@azure/msal-browser`, `@azure/msal-react`) |
| UI | Fluent UI v9 (`@fluentui/react-components`) |
| Data Fetching | TanStack Query v5 |
| State | Zustand v5 |
| Map | Leaflet 1.9 + react-leaflet (custom click-based drawing) |
| Geo | Turf.js (`@turf/boolean-point-in-polygon`) |
| HTTP | Axios |
| Dates | date-fns v4 |

---

*Built for Microsoft GBB Field Service practice — Demo Data Generation Use Case*
