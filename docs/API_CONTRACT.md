# ReadyUp — Complete API Contract & Frontend Integration Specification

> **Version:** 1.0.0  
> **Status:** Implemented & Verified on `Backend` branch  
> **Target Audience:** ReadyUp Frontend Development Team  
> **Base URL:** `http://localhost:5001/api/v1`  
> **Default Port:** `5001`  

---

## Table of Contents

1. [Visual Design System & Frontend UI Mapping](#1-visual-design-system--frontend-ui-mapping)
2. [Global Architecture & Conventions](#2-global-architecture--conventions)
   - [Standard Success Response](#standard-success-response)
   - [Standard Paginated Response](#standard-paginated-response)
   - [Standard Error Response](#standard-error-response)
   - [HTTP Status Codes](#http-status-codes)
3. [Implemented Endpoints vs. Planned Endpoints](#3-implemented-endpoints-vs-planned-endpoints)
4. [Complete Endpoint Reference (Implemented)](#4-complete-endpoint-reference-implemented)
   - [4.1 Health Check](#41-health-check)
   - [4.2 Authentication & User Profile](#42-authentication--user-profile)
   - [4.3 Aptitude Categories, Topics & Questions](#43-aptitude-categories-topics--questions)
   - [4.4 Companies & Hiring Patterns](#44-companies--hiring-patterns)
   - [4.5 Practice Drills & Mock Tests](#45-practice-drills--mock-tests)
   - [4.6 Question Bookmarks](#46-question-bookmarks)
   - [4.7 Student Analytics & Dashboards](#47-student-analytics--dashboards)
   - [4.8 T&P Coordinator Question Management & Spreadsheet Imports](#48-tp-coordinator-question-management--spreadsheet-imports)
   - [4.9 Admin User Management & Platform Audit Logs](#49-admin-user-management--platform-audit-logs)
5. [Frontend Form Specifications](#5-frontend-form-specifications)
6. [Excel/CSV Spreadsheet Import Workflow](#6-excelcsv-spreadsheet-import-workflow)
7. [External Website Redirect & SSO Architecture](#7-external-website-redirect--sso-architecture)
   - [Current Authentication Flow](#71-current-authentication-flow)
   - [Designed SSO Handoff Integration](#72-designed-sso-handoff-integration)
   - [Information Required Before Implementation](#73-information-required-before-implementation)
8. [Sample Credentials for Local Development](#8-sample-credentials-for-local-development)

---

## 1. Visual Design System & Frontend UI Mapping

The ReadyUp visual design system is based on the **ProjectSync / Mentor Workspace** reference UI:

| Token / Element | Value / Rule | Frontend Usage |
| :--- | :--- | :--- |
| **Primary Accent** | `#0D9488` (Teal 600) / `#0F766E` (Teal 700) | Primary CTA buttons, active sidebar items, header highlights |
| **Primary Hover** | `#115E59` (Teal 800) | Button hover & active states |
| **Soft Surface Tint** | `#F0FDF4` (Mint 50) / `#ECFDF5` | Selected card backgrounds, icon containers, active nav pills |
| **App Canvas Background** | `#F8FAFC` (Slate 50) | Main page body background |
| **Card Surface** | `#FFFFFF` (Pure White) | Card containers with `border: 1px solid #F1F5F9` |
| **Border Radii** | `16px` to `20px` for cards, `9999px` for pills/buttons | Rounded components matching screenshot |
| **Elevation / Shadow** | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` | Subtle depth without harsh drop-shadows |
| **Badge: Pending / Needs Review** | Background: `#FEF3C7` (Amber 100), Text: `#B45309` (Amber 700) | Test attempts needing review, pending imports |
| **Badge: Passed / Verified** | Background: `#DCFCE7` (Emerald 100), Text: `#15803D` (Emerald 700) | Passed tests, verified questions |
| **Badge: Changes / Incomplete** | Background: `#FEE2E2` (Rose 100), Text: `#B91C1C` (Rose 700) | Deactivated status, failed attempts |

### Pre-Aggregated Dashboard Endpoints

To avoid client-side computation, the backend provides three role-tailored dashboard endpoints:
1. **Student Dashboard:** `GET /api/v1/analytics/dashboard`
   - Feeds the 4 metric cards (Tests Completed, Average Accuracy %, Study Time in hours, Pass Rate).
   - Feeds the prominent **"NEXT BEST ACTION"** banner card (e.g., lowest-accuracy topic recommendation with direct practice query).
   - Feeds the **Weekly Goal Donut** widget (`percentage: 50`, `current: 2`, `target: 4`).
   - Feeds Recent Test Attempts with pre-formatted status badges (`Passed` or `Needs Review`).
2. **Coordinator Dashboard:** `GET /api/v1/coordinator/dashboard`
   - Feeds question bank metric cards, pending import counts, and recent spreadsheet upload history.
3. **Admin Dashboard:** `GET /api/v1/admin/dashboard`
   - Feeds total user counts by role, active users, total test attempts conducted, platform pass rate, and recent audit logs.

---

## 2. Global Architecture & Conventions

### Authentication Header
Protected endpoints require an HTTP `Authorization` header containing the JWT token returned by the login endpoint:
```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### Standard Success Response
Every successful API request returns HTTP `200` (or `201` for created resources) with this consistent envelope:
```json
{
  "success": true,
  "message": "Human-readable status or confirmation message",
  "data": { ... }
}
```

### Standard Paginated Response
Endpoints returning paginated lists include a `pagination` metadata object:
```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Standard Error Response
If an error occurs, the server returns an appropriate HTTP error status (`400`, `401`, `403`, `404`, `409`, `500`) with:
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```
If the error is due to form or parameter validation, a detailed `errors` array is included:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters long"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Invalid payload, missing fields, or validation failure.
- `401 Unauthorized`: Missing, expired, or invalid authentication token.
- `403 Forbidden`: Authenticated user's role lacks permission for the endpoint.
- `404 Not Found`: Requested resource does not exist.
- `409 Conflict`: Duplicate unique key (e.g. email or `questionId` already registered).
- `500 Internal Server Error`: Server exception.

---

## 3. Implemented Endpoints vs. Planned Endpoints

### Fully Implemented and Verified Endpoints (Ready for Frontend)

| Module | Method | Endpoint | Required Role |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/v1/health` | Public |
| **Auth** | `POST` | `/api/v1/auth/register` | Public |
| **Auth** | `POST` | `/api/v1/auth/login` | Public |
| **Auth** | `POST` | `/api/v1/auth/logout` | Authenticated (Any) |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated (Any) |
| **Auth** | `PUT` | `/api/v1/auth/profile` | Authenticated (Any) |
| **Auth** | `PUT` | `/api/v1/auth/change-password` | Authenticated (Any) |
| **Questions** | `GET` | `/api/v1/questions/categories` | Authenticated (Any) |
| **Questions** | `GET` | `/api/v1/questions` | Authenticated (Any) |
| **Questions** | `GET` | `/api/v1/questions/:id` | Authenticated (Any) |
| **Questions** | `POST` | `/api/v1/questions` | **Coordinator Only** |
| **Questions** | `PUT` | `/api/v1/questions/:id` | **Coordinator Only** |
| **Questions** | `PATCH` | `/api/v1/questions/:id/status` | **Coordinator Only** |
| **Companies** | `GET` | `/api/v1/companies` | Authenticated (Any) |
| **Companies** | `GET` | `/api/v1/companies/:slug` | Authenticated (Any) |
| **Tests** | `GET` | `/api/v1/tests/mock-tests` | Authenticated (Any) |
| **Tests** | `GET` | `/api/v1/tests/mock-tests/:id` | Authenticated (Any) |
| **Tests** | `POST` | `/api/v1/tests/practice/start` | **Student Only** |
| **Tests** | `POST` | `/api/v1/tests/mock-tests/:id/start` | **Student Only** |
| **Tests** | `POST` | `/api/v1/tests/attempts/:attemptId/submit` | **Student Only** |
| **Tests** | `GET` | `/api/v1/tests/attempts/:attemptId/review` | **Student Only** |
| **Tests** | `GET` | `/api/v1/tests/history` | **Student Only** |
| **Tests** | `GET` | `/api/v1/tests/incorrect` | **Student Only** |
| **Tests** | `POST` | `/api/v1/tests/mock-tests` | **Coordinator Only** |
| **Bookmarks** | `GET` | `/api/v1/bookmarks` | **Student Only** |
| **Bookmarks** | `POST` | `/api/v1/bookmarks` | **Student Only** |
| **Bookmarks** | `DELETE` | `/api/v1/bookmarks/:questionId` | **Student Only** |
| **Analytics** | `GET` | `/api/v1/analytics/dashboard` | **Student Only** |
| **Coordinator** | `GET` | `/api/v1/coordinator/dashboard` | **Coordinator Only** |
| **Coordinator** | `GET` | `/api/v1/coordinator/import/template` | **Coordinator Only** |
| **Coordinator** | `POST` | `/api/v1/coordinator/import/preview` | **Coordinator Only** |
| **Coordinator** | `POST` | `/api/v1/coordinator/import/confirm` | **Coordinator Only** |
| **Coordinator** | `GET` | `/api/v1/coordinator/import/history` | **Coordinator Only** |
| **Admin** | `GET` | `/api/v1/admin/dashboard` | **Admin Only** |
| **Admin** | `GET` | `/api/v1/admin/users` | **Admin Only** |
| **Admin** | `POST` | `/api/v1/admin/users` | **Admin Only** |
| **Admin** | `GET` | `/api/v1/admin/users/:id` | **Admin Only** |
| **Admin** | `PATCH` | `/api/v1/admin/users/:id/role` | **Admin Only** |
| **Admin** | `PATCH` | `/api/v1/admin/users/:id/status` | **Admin Only** |
| **Admin** | `GET` | `/api/v1/admin/audit-logs` | **Admin Only** |

### Planned Endpoints (Not Implemented / Pending Spec)

| Planned Endpoint | Method | Intended Function | Status |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/sso/callback` | `POST` | Accept external SSO ticket/assertion and return ReadyUp JWT | Planned |
| `/api/v1/auth/sso/config` | `GET` | Return public SSO redirect URL for external portal | Planned |

---

## 4. Complete Endpoint Reference (Implemented)

### 4.1 Health Check
`GET /api/v1/health` (Public)

### 4.2 Authentication & User Profile
- `POST /api/v1/auth/register` (Public)
- `POST /api/v1/auth/login` (Public)
- `POST /api/v1/auth/logout` (Auth)
- `GET /api/v1/auth/me` (Auth)
- `PUT /api/v1/auth/profile` (Auth)
- `PUT /api/v1/auth/change-password` (Auth)

### 4.3 Aptitude Categories, Topics & Questions
- `GET /api/v1/questions/categories` (Auth)
- `GET /api/v1/questions` (Auth)
- `GET /api/v1/questions/:id` (Auth)
- `POST /api/v1/questions` (Coordinator)
- `PUT /api/v1/questions/:id` (Coordinator)
- `PATCH /api/v1/questions/:id/status` (Coordinator)

### 4.4 Companies & Hiring Patterns
- `GET /api/v1/companies` (Auth)
- `GET /api/v1/companies/:slug` (Auth)

### 4.5 Practice Drills & Mock Tests
- `GET /api/v1/tests/mock-tests` (Auth)
- `GET /api/v1/tests/mock-tests/:id` (Auth)
- `POST /api/v1/tests/practice/start` (Student)
- `POST /api/v1/tests/mock-tests/:id/start` (Student)
- `POST /api/v1/tests/attempts/:attemptId/submit` (Student)
- `GET /api/v1/tests/attempts/:attemptId/review` (Student)
- `GET /api/v1/tests/history` (Student)
- `GET /api/v1/tests/incorrect` (Student)
- `POST /api/v1/tests/mock-tests` (Coordinator)

### 4.6 Question Bookmarks
- `GET /api/v1/bookmarks` (Student)
- `POST /api/v1/bookmarks` (Student)
- `DELETE /api/v1/bookmarks/:questionId` (Student)

### 4.7 Student Analytics & Dashboards
- `GET /api/v1/analytics/dashboard` (Student)

### 4.8 T&P Coordinator Question Management & Spreadsheet Imports
- `GET /api/v1/coordinator/dashboard` (Coordinator)
- `GET /api/v1/coordinator/import/template` (Coordinator)
- `POST /api/v1/coordinator/import/preview` (Coordinator)
- `POST /api/v1/coordinator/import/confirm` (Coordinator)
- `GET /api/v1/coordinator/import/history` (Coordinator)

### 4.9 Admin User Management & Platform Audit Logs
- `GET /api/v1/admin/dashboard` (Admin)
- `GET /api/v1/admin/users` (Admin)
- `POST /api/v1/admin/users` (Admin)
- `GET /api/v1/admin/users/:id` (Admin)
- `PATCH /api/v1/admin/users/:id/role` (Admin)
- `PATCH /api/v1/admin/users/:id/status` (Admin)
- `GET /api/v1/admin/audit-logs` (Admin)

---

## 5. Frontend Form Specifications

Forms 1-13 as documented for Register, Login, Profile, Password, Practice Start, Test Submission, Bookmark, Coordinator Question Creation, Import Preview, Import Confirm, Admin User Provisioning, Role Assignment, Status Toggle.

---

## 6. Excel/CSV Spreadsheet Import Workflow

Spreadsheet columns:
`questionId`, `questionText`, `optionA`, `optionB`, `optionC`, `optionD`, `correctOption`, `explanation`, `category`, `topic`, `subtopic`, `difficulty`, `companies`, `source`, `year`.

---

## 7. External Website Redirect & SSO Architecture
Internal Auth (`/login`, `/register`, `/auth/me`), fallback or development flow. Modular SSO handler ready for external handoff.

---

## 8. Sample Credentials for Local Development
- **Student**: `student@readyup.edu` / `Password123!`
- **Coordinator**: `coordinator@readyup.edu` / `Password123!`
- **Admin**: `admin@readyup.edu` / `Password123!`
