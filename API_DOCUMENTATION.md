# ReadyUp — Backend API Documentation & Integration Contract

This document provides the complete API specification, design system mapping, database models, role permissions, and integration guidelines for the **ReadyUp** Aptitude Preparation Platform.

---

## 1. Visual Design System & Frontend Contract Mapping

Based on the **ProjectSync / Mentor Workspace** UI/UX reference screenshots, the ReadyUp frontend utilizes a clean, modern aesthetic with:
- **Primary Brand / Action Accent:** Deep Emerald / Teal (`#0D9488` / `#0F766E`)
- **Card Surfaces:** Pure white (`#FFFFFF`) with rounded corners (`16px`-`20px`) and subtle drop-shadows
- **Badges / Status Chips:** Pill-shaped badges with soft tinted backgrounds (`#FEF3C7` Amber for "Needs Review / Pending", `#DCFCE7` Emerald for "Passed / Verified", `#FEE2E2` Rose for "Changes Requested / Incomplete")
- **Visual Widgets:**
  - **Metric Stat Cards (4 columns):** Pre-calculated dashboard metrics (tests completed, accuracy, time spent, pass rate)
  - **"NEXT BEST ACTION" Banner:** High-priority guided action card with direct CTA button
  - **Weekly Goal Donut Widget:** Circular progress indicator (e.g. `50% - 2 of 4 weekly tests completed`)

The backend provides pre-aggregated dashboard endpoints (`/api/v1/analytics/dashboard`, `/api/v1/coordinator/dashboard`, `/api/v1/admin/dashboard`) specifically tailored to populate these UI widgets directly without client-side heavy lifting.

---

## 2. Authentication & Base URL

- **Base URL:** `http://localhost:5001/api/v1`
- **Authentication Scheme:** `Authorization: Bearer <JWT_TOKEN>`
- **Response Wrapper:**
  ```json
  {
    "success": true,
    "message": "Human-readable status message",
    "data": { ... },
    "pagination": { ... } // Optional for list endpoints
  }
  ```

---

## 3. Seed Credentials for Local Testing

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `student@readyup.edu` | `Password123!` | Practice drills, mock tests, submit answers, explanations, bookmarks, performance analytics |
| **T&P Coordinator** | `coordinator@readyup.edu` | `Password123!` | Excel/CSV uploads, question preview & validation, publish questions, topic management, test creation |
| **Admin** | `admin@readyup.edu` | `Password123!` | User management, role assignment, platform stats, system audit logs *(Cannot edit aptitude questions)* |

---

## 4. API Endpoints

### 4.1 Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new account (`name`, `email`, `password`, `role`: student/coordinator/admin) |
| `POST` | `/auth/login` | Public | Sign in (`email`, `password`). Returns user object and JWT `token` |
| `POST` | `/auth/logout` | Authenticated | Terminate session / token invalidation |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `PUT` | `/auth/profile` | Authenticated | Update user profile details (`name`, `department`, `college`, `studentId`, `graduationYear`) |
| `PUT` | `/auth/change-password` | Authenticated | Update password (`currentPassword`, `newPassword`) |

---

### 4.2 Questions, Topics & Companies (`/api/v1/questions` & `/api/v1/companies`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/questions/categories` | All | Get all aptitude categories with topics, subtopics, and question counts |
| `GET` | `/questions` | All | Search & filter questions (`category`, `topic`, `subtopic`, `difficulty`, `company`, `search`, `page`, `limit`) |
| `GET` | `/questions/:id` | All | Get single question details |
| `POST` | `/questions` | Coordinator Only | Add a new question directly |
| `PUT` | `/questions/:id` | Coordinator Only | Update an existing question |
| `PATCH` | `/questions/:id/status` | Coordinator Only | Toggle question active status (`{ "isActive": boolean }`) |
| `GET` | `/companies` | All | List companies with active question counts and hiring patterns |
| `GET` | `/companies/:slug` | All | Get specific company hiring pattern and topic breakdown |

---

### 4.3 Student Practice & Mock Tests (`/api/v1/tests`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tests/mock-tests` | All | List available full-length and company-specific mock tests |
| `GET` | `/tests/mock-tests/:id` | All | Retrieve mock test syllabus, duration, instructions |
| `POST` | `/tests/practice/start` | Student | Start custom practice session (`{ category, topic, difficulty, company, count }`). Answers are sanitized and stripped |
| `POST` | `/tests/mock-tests/:id/start` | Student | Start timed mock test. Server calculates `expiresAt` deadline |
| `POST` | `/tests/attempts/:attemptId/submit` | Student | Submit test attempt. Server verifies answers, calculates score, topic breakdown, accuracy %, and recommendations |
| `GET` | `/tests/attempts/:attemptId/review` | Student | View completed test review with student choices, correct answers, and step-by-step explanations |
| `GET` | `/tests/history` | Student | Retrieve student's completed test attempt history with scores |
| `GET` | `/tests/incorrect` | Student | Retrieve questions missed in past attempts for targeted retry |
| `POST` | `/tests/mock-tests` | Coordinator | Create a new structured mock test |

---

### 4.4 Bookmarks (`/api/v1/bookmarks`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/bookmarks` | Student | List bookmarked questions with personal notes |
| `POST` | `/bookmarks` | Student | Bookmark a question (`{ "questionId": "QA-TW-001", "note": "Formula review" }`) |
| `DELETE` | `/bookmarks/:questionId` | Student | Remove bookmark |

---

### 4.5 Student Analytics (`/api/v1/analytics`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/dashboard` | Student | Pre-computed dashboard metrics: 4 metric cards, "Next Best Action" card, Weekly Goal donut progress %, Weak/Strong topics, Recent test timeline |

---

### 4.6 T&P Coordinator Excel/CSV Imports (`/api/v1/coordinator`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/coordinator/dashboard` | Coordinator | Overview metrics (total questions bank, active topics, pending import reviews, recent imports) |
| `GET` | `/coordinator/import/template?format=csv\|xlsx` | Coordinator | Download standard question template in `.csv` or `.xlsx` format |
| `POST` | `/coordinator/import/preview` | Coordinator | Upload spreadsheet (`multipart/form-data`, key: `file`). Validates rows without modifying DB. Returns valid rows, invalid rows, row numbers, and error messages |
| `POST` | `/coordinator/import/confirm` | Coordinator | Confirm and publish staged batch (`{ "importBatchId": "..." }`). Upserts questions by stable `questionId`, auto-syncs topics and companies |
| `GET` | `/coordinator/import/history` | Coordinator | View history of imports (uploader, timestamp, valid/invalid counts, inserted/updated counts) |

---

### 4.7 Admin Management (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | Admin | Platform statistics: student count, coordinator count, total questions, total tests conducted, system pass rate, audit logs |
| `GET` | `/admin/users` | Admin | List and search users (`role`, `isActive`, `search`, `page`, `limit`) |
| `POST` | `/admin/users` | Admin | Create user account (`name`, `email`, `password`, `role`, `department`) |
| `GET` | `/admin/users/:id` | Admin | View user account details |
| `PATCH` | `/admin/users/:id/role` | Admin | Assign role (`{ "role": "coordinator" }`) |
| `PATCH` | `/admin/users/:id/status` | Admin | Activate or deactivate account (`{ "isActive": boolean }`) |
| `GET` | `/admin/audit-logs` | Admin | View searchable audit logs of administrative and content actions |

---

## 5. Excel & CSV Import Specification

Spreadsheets uploaded by the T&P Coordinator must provide the following columns in row 1:

| Column Header | Required | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `questionId` | Yes | `QA-TW-001` | Unique, stable identifier used for upserts |
| `questionText` | Yes | `A can do a work in 12 days...` | Full question text |
| `optionA` | Yes | `7.2 days` | Option A text |
| `optionB` | Yes | `6.5 days` | Option B text |
| `optionC` | Yes | `8.0 days` | Option C text |
| `optionD` | Yes | `5.4 days` | Option D text |
| `correctOption`| Yes | `A` | Must be `A`, `B`, `C`, or `D` |
| `explanation`  | Yes | `A's 1-day work = 1/12...` | Step-by-step detailed solution |
| `category`     | Yes | `Quantitative Aptitude` | Category name |
| `topic`        | Yes | `Time and Work` | Topic name |
| `subtopic`     | No  | `Combined Work` | Specific subtopic |
| `difficulty`   | Yes | `easy` | Must be `easy`, `medium`, or `hard` |
| `companies`    | No  | `TCS, Infosys, Wipro` | Comma-separated company names |
| `source`       | No  | `TCS NQT 2024` | Source or exam name |
| `year`         | No  | `2024` | Year |

---

## 6. Local Setup and Commands

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Tests (Automated In-Memory DB):**
   ```bash
   npm test
   ```

3. **Seed Sample Database:**
   ```bash
   npm run seed
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   # or
   npm start
   ```
   *The server defaults to port `5001` and connects to local MongoDB or automatically initializes an in-memory database fallback if a standalone MongoDB instance is not active.*
