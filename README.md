# SkillBridge

An end-to-end, deployed prototype of an attendance management system for the fictional state-level skilling programme "SkillBridge".

I have written this README against the current codebase and it is structured to match the assignment requirements.

## Table of Contents

1. [Live URLs](#1-live-urls)
2. [Test Accounts](#2-test-accounts)
3. [Stack Choices (I did not diverge from the recommended stack)](#3-stack-choices-i-did-not-diverge-from-the-recommended-stack)
4. [Setup Instructions (Local Run)](#4-setup-instructions-local-run)
5. [Environment Variables](#5-environment-variables)
6. [Schema Documentation and Design Decisions](#6-schema-documentation-and-design-decisions)
7. [API Documentation (All Routes)](#7-api-documentation-all-routes)
8. [Frontend Documentation](#8-frontend-documentation)
9. [Assignment Requirement Coverage](#9-assignment-requirement-coverage)
10. [What Is Fully Working, What Is Partial, What Was Skipped](#10-what-is-fully-working-what-is-partial-what-was-skipped)
11. [One Thing I Would Do Differently With More Time](#11-one-thing-i-would-do-differently-with-more-time)

## 1. Live URLs

- Frontend: https://skillbridge.vishnuhq.com
- Backend API base URL: https://skillbridgebackend.vishnuhq.com
- Health check: https://skillbridgebackend.vishnuhq.com/health

Use `/health` for service checks.

Expected health check response:

```json
{ "status": "ok" }
```

CORS note:

- I configured the backend to accept requests only from the frontend URL.
- In production, the allowed origin is set through `FRONTEND_URL` and currently points to `https://skillbridge.vishnuhq.com`.

## 2. Test Accounts

All accounts below use the same password:

- Password: `Skillbridge123`

Primary role accounts:

| Role               | Email                                | Password         |
| ------------------ | ------------------------------------ | ---------------- |
| Student            | `student1@skillbridge.com`           | `Skillbridge123` |
| Trainer            | `trainer1@skillbridge.com`           | `Skillbridge123` |
| Institution        | `institution1@skillbridge.com`       | `Skillbridge123` |
| Programme Manager  | `programmanager1@skillbridge.com`    | `Skillbridge123` |
| Monitoring Officer | `monitoringofficer1@skillbridge.com` | `Skillbridge123` |

I additionally prepared these other test accounts:

- Students: `student1@skillbridge.com` to `student15@skillbridge.com`
- Trainers: `trainer1@skillbridge.com` to `trainer6@skillbridge.com`
- Institutions: `institution1@skillbridge.com` to `institution3@skillbridge.com`
- All of them use the same password: `Skillbridge123`

You can also create your own accounts. Signup is not hardcoded to fixed users, and testing new signup/onboarding flows is supported.

## 3. Stack Choices (I did not diverge from the recommended stack)

I did not diverge from the recommended stack.

| Layer    | Choice                                           | Why                                                                            |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Frontend | React + React Router + Vite (deployed on Vercel) | Fast development, simple route-based role views, easy deployment               |
| Backend  | Node.js + Express (deployed on Railway)          | Clear REST API structure and middleware-based auth/role checks                 |
| Database | Neon PostgreSQL                                  | Hosted Postgres with good free-tier developer experience                       |
| ORM      | Prisma                                           | Strong schema modeling, clean relations, and migration support                 |
| Auth     | Clerk                                            | Reliable hosted auth and session management, integrated with React and Express |

Notes:

- The app is a PERN-style application (PostgreSQL, Express, React, Node).
- Clerk is used for authentication, but authorization decisions are enforced server-side using local DB roles on every protected route.
- I spent a significant amount of time initially learning Clerk integration details. After going through the docs and integrating step by step, the setup became straightforward.

## 4. Setup Instructions (Local Run)

### Prerequisites

- Node.js 22+
- npm
- A PostgreSQL connection string (Neon recommended)
- Clerk project (publishable key + secret key)

### 4.1 Backend Setup

```bash
cd backend
npm install
```

Environment:

- I included a `.env` file in this submission for the reviewer's convenience.
- Normally, API `.env` files are not included in submissions.
- You are welcome to replace these with your own Clerk and Neon keys and test freely.

If you want to create your own env file from template:

```bash
cp .env.example .env
```

Generate Prisma client and apply migrations:

```bash
npm run db:generate
npx prisma migrate deploy
```

Run backend:

```bash
npm run dev
```

Default backend local URL:

- `http://localhost:3000`

### 4.2 Frontend Setup

```bash
cd ../frontend
npm install
```

Environment:

- I included a `.env` included for the reviewer's convenience.
- You can replace values with your own Clerk publishable key and API base URL.

If you want to create your own env file from template:

```bash
cp .env.example .env
```

Run frontend:

```bash
npm run dev
```

Default frontend local URL:

- `http://localhost:5173`

### 4.3 Quick Local Verification

1. Open frontend at `http://localhost:5173`
2. Verify backend health at `http://localhost:3000/health` (should return `{"status":"ok"}`)
3. Sign in with a provided test account or create a new account and complete onboarding

## 5. Environment Variables

### Backend (`backend/.env`)

Runtime keys used by backend code:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `FRONTEND_URL`
- `PORT`
- `NODE_ENV` (optional but recommended)

### Frontend (`frontend/.env`)

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`

## 6. Schema Documentation and Design Decisions

### 6.1 Enums

Role enum:

- `STUDENT`
- `TRAINER`
- `INSTITUTION`
- `PROGRAMME_MANAGER`
- `MONITORING_OFFICER`

AttendanceStatus enum:

- `PRESENT`
- `ABSENT`
- `LATE`

InviteType enum:

- `ONE_TIME`
- `REUSABLE`

### 6.2 Full Entity Documentation

#### `users`

- `id` (PK, `cuid`)
- `clerk_user_id` (unique)
- `name`
- `role` (Role enum)
- `institution_id` (nullable FK to `institutions.id`)
- `created_at`

Relations:

- belongs to one institution (optional)
- has many trainer sessions
- has many attendance records
- linked in `batch_trainers`
- linked in `batch_students`
- creator in `batch_invites`

#### `institutions`

- `id` (PK, `cuid`)
- `name`
- `created_at`

Relations:

- has many users
- has many batches

#### `batches`

- `id` (PK, `cuid`)
- `name`
- `institution_id` (FK)
- `created_at`

Relations:

- belongs to one institution
- has many trainers via `batch_trainers`
- has many students via `batch_students`
- has many sessions
- has many invites

#### `batch_trainers` (explicit many-to-many join)

- `batch_id` (FK)
- `trainer_id` (FK)
- Composite PK: (`batch_id`, `trainer_id`)

#### `batch_students` (explicit many-to-many join)

- `batch_id` (FK)
- `student_id` (FK)
- Composite PK: (`batch_id`, `student_id`)

#### `sessions`

- `id` (PK, `cuid`)
- `batch_id` (FK)
- `trainer_id` (FK)
- `title`
- `date` (string in `YYYY-MM-DD`)
- `start_time` (string in `HH:MM`)
- `end_time` (string in `HH:MM`)
- `created_at`

Relations:

- belongs to one batch
- belongs to one trainer
- has many attendance rows

#### `attendance`

- `id` (PK, `cuid`)
- `session_id` (FK)
- `student_id` (FK)
- `status` (AttendanceStatus enum)
- `marked_at`
- Unique constraint: (`session_id`, `student_id`)

#### `batch_invites`

- `id` (PK, `cuid`)
- `token` (unique, auto-generated)
- `batch_id` (FK)
- `created_by_id` (FK to users)
- `type` (InviteType enum, default `ONE_TIME`)
- `is_active` (default true)
- `use_count` (default 0)
- `expires_at` (nullable)
- `created_at`

### 6.3 Relationship Summary

- Institution -> many Users
- Institution -> many Batches
- Batch <-> Trainer via `batch_trainers`
- Batch <-> Student via `batch_students`
- Batch -> many Sessions
- Session -> many Attendance
- User -> many Attendance (as student)
- User -> many Session (as trainer)
- Batch -> many BatchInvite

### 6.4 Key Design Decisions and Reasoning

1. Role stored in local DB, not trusted from frontend
   - Clerk proves identity; backend uses DB role for authorization.
   - Every protected route checks roles server-side.

2. Explicit join tables for trainer/student batch membership
   - Better control for constraints and role-specific logic.
   - Clear support for many-to-many relationships.

3. Attendance uniqueness by (`session_id`, `student_id`)
   - Enforces one attendance record per student per session.

4. Invite lifecycle model (`ONE_TIME` / `REUSABLE`, `is_active`, `expires_at`, `use_count`)
   - Supports both single-use and multi-use onboarding links.

5. Session time validation and lifecycle sync
   - Session creation only allows future sessions.
   - Attendance marking is allowed only during active session window.
   - Automatic late classification after 15 minutes.
   - Automatic absent backfill for ended sessions where no mark exists.

## 7. API Documentation (All Routes)

### 7.1 Common API Rules

- Base URL: `https://skillbridgebackend.vishnuhq.com`
- Protected routes require: `Authorization: Bearer <clerk_jwt>`
- Role checks are server-side on every protected route.
- Backend endpoint inventory (verified from source):
  - `19` total method+path URLs exposed (including singular alias mount at `/institution/*`)
  - `17` unique logical endpoints (excluding the 2 singular/plural alias duplicates)
- Error shape:

```json
{ "error": "message" }
```

- Validation errors:

```json
{
  "error": "Validation failed",
  "fields": {
    "fieldName": ["reason"]
  }
}
```

### 7.2 Health and Public

#### `GET /health`

- Access: Public
- Body: none
- Returns `200`:

```json
{ "status": "ok" }
```

#### `GET /public/institutions`

- Access: Public
- Body: none
- Returns `200`:

```json
{
  "institutions": [{ "id": "...", "name": "..." }]
}
```

### 7.3 Auth

#### `POST /auth/sync`

- Access: Signed-in Clerk user (onboarding)
- Request body:

```json
{
  "name": "User Name",
  "role": "STUDENT|TRAINER|INSTITUTION|PROGRAMME_MANAGER|MONITORING_OFFICER",
  "institutionId": "optional-or-required-by-role",
  "institutionName": "optional-for-institution-role"
}
```

Role-based validation:

- `STUDENT`, `TRAINER`: `institutionId` required
- `INSTITUTION`: one of `institutionId` or `institutionName` required
- `PROGRAMME_MANAGER`, `MONITORING_OFFICER`: institution fields not required

Response:

- `201` when user is newly created
- `200` when user already exists (idempotent)

```json
{
  "user": {
    "id": "...",
    "clerkUserId": "...",
    "name": "...",
    "role": "...",
    "institutionId": "...",
    "createdAt": "...",
    "institution": { "id": "...", "name": "..." }
  }
}
```

#### `GET /auth/me`

- Access: Any authenticated onboarded user
- Body: none
- Returns `200`:

```json
{
  "user": {
    "id": "...",
    "clerkUserId": "...",
    "name": "...",
    "role": "...",
    "institutionId": "...",
    "createdAt": "...",
    "institution": { "id": "...", "name": "..." }
  }
}
```

Possible auth states:

- `401` if not authenticated
- `404` if Clerk-authenticated but DB profile not created yet

### 7.4 Batch APIs

#### `GET /batches`

- Access: `INSTITUTION`, `TRAINER`
- Body: none

Returns `200`:

- For `INSTITUTION`: all batches in institution, including trainer list and counts
- For `TRAINER`: only assigned batches, including counts

Response shape for `INSTITUTION` (`200`):

```json
{
  "batches": [
    {
      "id": "...",
      "name": "...",
      "institutionId": "...",
      "createdAt": "...",
      "trainers": [
        {
          "batchId": "...",
          "trainerId": "...",
          "trainer": { "id": "...", "name": "..." }
        }
      ],
      "_count": { "students": 0, "sessions": 0 }
    }
  ]
}
```

Response shape for `TRAINER` (`200`):

```json
{
  "batches": [
    {
      "id": "...",
      "name": "...",
      "institutionId": "...",
      "createdAt": "...",
      "_count": { "students": 0, "sessions": 0 }
    }
  ]
}
```

#### `POST /batches`

- Access: `TRAINER`, `INSTITUTION`
- Request body:

```json
{
  "name": "Batch Name"
}
```

- Validation: name length 2..120
- Behavior:
  - Uses caller's `institutionId`
  - If caller is `TRAINER`, trainer is auto-assigned to the new batch

Returns `201`:

```json
{
  "batch": {
    "id": "...",
    "name": "...",
    "institutionId": "...",
    "createdAt": "...",
    "institution": { "id": "...", "name": "..." },
    "trainers": [],
    "_count": { "students": 0, "sessions": 0 }
  }
}
```

#### `POST /batches/:id/trainers`

- Access: `INSTITUTION`
- Request body:

```json
{
  "trainerId": "..."
}
```

- Validates trainer exists, has role `TRAINER`, belongs to same institution, and is not already assigned

Returns `201`:

```json
{
  "message": "Trainer assigned successfully"
}
```

#### `POST /batches/:id/invite`

- Access: `TRAINER` assigned to batch
- Request body:

```json
{
  "type": "ONE_TIME|REUSABLE",
  "expiresAt": "optional ISO datetime or null"
}
```

- Validation:
  - `type` default is `ONE_TIME`
  - `expiresAt` must be a valid ISO datetime if provided

Returns `201`:

```json
{
  "invite": {
    "id": "...",
    "token": "...",
    "batchId": "...",
    "createdById": "...",
    "type": "ONE_TIME",
    "isActive": true,
    "useCount": 0,
    "expiresAt": null,
    "createdAt": "..."
  },
  "inviteUrl": "https://skillbridge.vishnuhq.com/join?token=...&batchId=..."
}
```

#### `POST /batches/:id/join`

- Access: `STUDENT`
- Request body:

```json
{
  "token": "..."
}
```

Behavior:

- Validates active invite token for that batch
- Enrolls student in batch
- For ended sessions in that batch, backfills `ABSENT` rows
- Increments invite `useCount`
- Deactivates invite if `ONE_TIME`
- Idempotent if already enrolled

Returns `200`:

```json
{
  "message": "Successfully joined the batch"
}
```

or

```json
{
  "message": "You are already a member of this batch"
}
```

#### `GET /batches/:id/summary`

- Access: `INSTITUTION` owning the batch
- Body: none

Returns `200`:

```json
{
  "batch": { "id": "...", "name": "..." },
  "totalSessions": 0,
  "totalStudents": 0,
  "sessions": [
    {
      "id": "...",
      "title": "...",
      "date": "YYYY-MM-DD",
      "present": 0,
      "late": 0,
      "absent": 0,
      "total": 0
    }
  ]
}
```

### 7.5 Session APIs

#### `GET /sessions`

- Access: `TRAINER`, `STUDENT`

For `TRAINER`:

- Returns trainer-created sessions with batch details and attendance count.

For `STUDENT`:

- Returns sessions for student's enrolled batches.
- Includes only that student's attendance entry per session (`attendance` array with 0 or 1 item).

Response shape for `TRAINER` (`200`):

```json
{
  "sessions": [
    {
      "id": "...",
      "batchId": "...",
      "trainerId": "...",
      "title": "...",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "createdAt": "...",
      "batch": { "id": "...", "name": "..." },
      "_count": { "attendance": 0 }
    }
  ]
}
```

Response shape for `STUDENT` (`200`):

```json
{
  "sessions": [
    {
      "id": "...",
      "batchId": "...",
      "trainerId": "...",
      "title": "...",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "createdAt": "...",
      "batch": { "id": "...", "name": "..." },
      "attendance": [{ "status": "PRESENT|LATE|ABSENT", "markedAt": "..." }]
    }
  ]
}
```

#### `POST /sessions`

- Access: `TRAINER` assigned to batch
- Request body:

```json
{
  "batchId": "...",
  "title": "Session Title",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM"
}
```

Validation:

- title length 3..120
- valid date/time format
- `endTime > startTime`
- start and end must both be in the future

Returns `201`:

```json
{
  "session": {
    "id": "...",
    "batchId": "...",
    "trainerId": "...",
    "title": "...",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "createdAt": "...",
    "batch": { "id": "...", "name": "..." },
    "_count": { "attendance": 0 }
  }
}
```

#### `GET /sessions/:id/attendance`

- Access: `TRAINER` owning that session
- Body: none

Returns `200`:

```json
{
  "session": {
    "id": "...",
    "title": "...",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "batch": { "id": "...", "name": "..." },
    "attendance": [
      {
        "id": "...",
        "sessionId": "...",
        "studentId": "...",
        "status": "PRESENT|LATE|ABSENT",
        "markedAt": "...",
        "student": { "id": "...", "name": "..." }
      }
    ]
  },
  "stats": {
    "present": 0,
    "late": 0,
    "absent": 0
  }
}
```

### 7.6 Attendance API

#### `POST /attendance/mark`

- Access: `STUDENT`
- Request body:

```json
{
  "sessionId": "..."
}
```

Important behavior:

- Student must be enrolled in the batch
- Student can mark only once per session
- Session must have started and not ended
- Status is auto-set by backend:
  - `PRESENT` if within 15 minutes from session start
  - `LATE` if after 15 minutes

Returns `201`:

```json
{
  "attendance": {
    "id": "...",
    "sessionId": "...",
    "studentId": "...",
    "status": "PRESENT|LATE",
    "markedAt": "..."
  }
}
```

### 7.7 Institution and Programme Summary APIs

#### `GET /institutions/trainers`

- Access: `INSTITUTION`
- Body: none
- Returns `200`:

```json
{
  "trainers": [{ "id": "...", "name": "..." }]
}
```

Compatibility alias:

- `GET /institution/trainers` is also routed to the same handler.

#### `GET /institutions/:id/summary`

- Access: `PROGRAMME_MANAGER`
- Body: none
- Returns `200`:

```json
{
  "institution": { "id": "...", "name": "..." },
  "batches": [
    {
      "id": "...",
      "name": "...",
      "totalStudents": 0,
      "totalSessions": 0,
      "attendanceRate": 0
    }
  ]
}
```

Compatibility alias:

- `GET /institution/:id/summary` is also routed to the same handler.

#### `GET /programme/summary`

- Access: `PROGRAMME_MANAGER`, `MONITORING_OFFICER`
- Body: none
- Returns `200`:

```json
{
  "summary": [
    {
      "id": "...",
      "name": "...",
      "totalBatches": 0,
      "totalSessions": 0,
      "attendanceRate": 0,
      "totalRecords": 0
    }
  ],
  "totals": {
    "institutions": 0,
    "batches": 0,
    "sessions": 0
  }
}
```

## 8. Frontend Documentation

### 8.1 Client Routes

- Frontend route inventory (verified from `src/App.jsx`):
  - `6` route entries (`/sign-in/*`, `/sign-up/*`, `/onboarding`, `/join`, `/dashboard/*`, and `*` fallback)

- `/sign-in` -> Clerk SignIn view
- `/sign-up` -> Clerk SignUp view
- `/onboarding` -> role + institution setup
- `/join?token=...&batchId=...` -> invite join prompt for students
- `/dashboard` -> role-based dashboard shell
- `*` -> fallback redirect to `/dashboard` (signed-in) or `/sign-in` (signed-out)

### 8.2 Auth + Profile Routing Logic

- App bootstraps Clerk in `main.jsx`.
- Axios interceptor injects Clerk token into every API request.
- On app load, `/auth/me` fetch decides whether user is onboarded.
- If signed in but no DB profile (`404`), user is redirected to onboarding.
- Invite query params are preserved through signup/onboarding and resumed after profile creation.

### 8.3 Role-specific Frontend Views

#### Student

- View enrolled sessions (`GET /sessions`)
- Mark attendance (`POST /attendance/mark`)
- Action button states:
  - `Not Started` before session start
  - `Closed` after session end
  - `Done` after mark

#### Trainer

- View own sessions and attendance detail (`GET /sessions`, `GET /sessions/:id/attendance`)
- Create session (`POST /sessions`)
- Create batch (`POST /batches`) with auto-assignment
- Generate invite links (`POST /batches/:id/invite`)

#### Institution

- View all institution batches (`GET /batches`)
- Create batch (`POST /batches`)
- View institution trainers (`GET /institutions/trainers`)
- Assign trainer (`POST /batches/:id/trainers`)
- View batch summary (`GET /batches/:id/summary`)

#### Programme Manager

- View programme-wide summary (`GET /programme/summary`)
- Drill down into institution summary (`GET /institutions/:id/summary`)

#### Monitoring Officer

- Read-only programme-wide summary (`GET /programme/summary`)
- No create/edit/delete actions in this dashboard

## 9. Assignment Requirement Coverage

### Task 1: Authentication and Role Access

- Completed for all five roles
- Role-based dashboard routing implemented
- Server-side role verification on protected endpoints
- Invite-link flow implemented for trainer -> student onboarding

### Task 2: Data Model and API

- Completed
- All required entities implemented with relations and constraints
- Required endpoints implemented
- Validation and permission checks added

### Task 3: Role-specific Frontend Views

- Completed
- Distinct dashboards for each role
- Real API-driven data (not hardcoded)

### Task 4: Deployment

- Completed
- Frontend deployed (Vercel)
- Backend deployed (Railway)
- Neon PostgreSQL and Clerk integrated

### Task 5: README

- Completed in this document with live URLs, test accounts, setup, schema decisions, stack decisions, implementation status, and next improvement direction.

## 10. What Is Fully Working, What Is Partial, What Was Skipped

- Fully working: all requested role flows, auth/onboarding, invite join flow, attendance marking, summaries, server-side authorization, and deployed URLs.
- Partially done: none.
- Skipped: none.

Checks and validations are implemented across request validation, role checks, enrollment checks, duplicate prevention, and attendance lifecycle constraints.

## 11. One Thing I Would Do Differently With More Time

With more time, I would add full end-to-end automated tests for all role flows (especially auth + invite + attendance lifecycle paths), strengthen robustness around scheduling edge cases (for example overlapping session checks), and further improve UI polish and usability.
