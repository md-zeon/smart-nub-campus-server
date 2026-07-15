# Onboarding API Guide - Smart NUB Campus Server

This document provides a comprehensive guide for the onboarding and authentication API endpoints. Follow the flow step by step to understand how users register, get verified, and authenticate into the system.

## Base Configuration

| Setting             | Value                                           |
| ------------------- | ----------------------------------------------- |
| **Base URL**        | `http://localhost:5000/api/v1`                  |
| **Content-Type**    | `application/json`                              |
| **Cookie Handling** | Enable "Always use cookies" in Postman settings |

---

## Table of Contents

1. [Onboarding Lifecycle](#onboarding-lifecycle)
2. [Onboarding States & Meanings](#onboarding-states--meanings)
3. [State Transition Diagram](#state-transition-diagram)
4. [Onboarding Flow](#onboarding-flow)
5. [Verification Management (Admin)](#verification-management-admin)
6. [Account Creation](#account-creation)
7. [Authentication Flow](#authentication-flow)
8. [Postman Collection Structure](#postman-collection-structure)
9. [Environment Variables](#environment-variables)
10. [Testing Scripts](#testing-scripts)
11. [Complete Test Flows](#complete-test-flows)

---

## Onboarding Lifecycle

This is the complete journey of a user from visitor to authenticated student:

```
Visitor
    ↓
GET /onboarding/current

VERIFICATION_FORM
    ↓
POST /verification/request

ADMIN_REVIEW (PENDING)
    ↓
Admin approves via /verification/{id}/approve

ACCOUNT_CREATION
    ↓
POST /account/create

COMPLETED
    ↓
    POST /auth/sign-in/email

Authenticated
```

---

## Onboarding States & Meanings

| State               | Meaning                                        | Allowed Action             |
| ------------------- | ---------------------------------------------- | -------------------------- |
| `VERIFICATION_FORM` | User has not submitted verification            | Submit verification        |
| `ADMIN_REVIEW`      | Waiting for admin review or rejected           | Wait (pending) or resubmit |
| `ACCOUNT_CREATION`  | Verification approved, ready to create account | Create account             |
| `COMPLETED`         | Onboarding finished, account created           | Login                      |

---

## State Transition Diagram

```
                    VERIFICATION_FORM
                            │
                            ▼
                    ADMIN_REVIEW (PENDING)
                            │
                            ├──────────────┐
                            ▼              ▼
                ACCOUNT_CREATION    ADMIN_REVIEW (REJECTED)
                            │              │
                            ▼              │
                    COMPLETED             │
                            │              │
                            └──────────────┘
                                    │
                                    ▼
                            (Resubmit via POST /verification/request)
                                    │
                                    ▼
                            ADMIN_REVIEW (PENDING)
```

---

## Onboarding Flow

### 1. Get Current Onboarding Step

**Request Name in Postman:** `Onboarding - Get Current Step`

- **Method:** `GET`
- **URL:** `{{base_url}}/onboarding/current`
- **Headers:** None required
- **Cookies:** None required (initially)

**Description:** Check the current onboarding step. This endpoint is public and doesn't require authentication.

#### All Possible Responses:

**a) Initial State (No Active Session):**

```json
{
  "success": true,
  "message": "Onboarding state retrieved successfully.",
  "data": {
    "hasActiveOnboarding": false,
    "currentStep": null
  }
}
```

**b) VERIFICATION_FORM State:**

```json
{
  "success": true,
  "message": "Onboarding state retrieved successfully.",
  "data": {
    "currentStep": "VERIFICATION_FORM",
    "verificationStatus": null,
    "verificationRequest": null,
    "note": null
  }
}
```

**c) ADMIN_REVIEW (PENDING):**

```json
{
  "success": true,
  "message": "Onboarding state retrieved successfully.",
  "data": {
    "currentStep": "ADMIN_REVIEW",
    "verificationStatus": "PENDING",
    "verificationRequest": null,
    "note": null
  }
}
```

**d) ADMIN_REVIEW (REJECTED) with Note:**

```json
{
  "success": true,
  "message": "Onboarding state retrieved successfully.",
  "data": {
    "currentStep": "ADMIN_REVIEW",
    "verificationStatus": "REJECTED",
    "verificationRequest": null,
    "note": "ID card image is unclear. Please resubmit with a clearer photo."
  }
}
```

**e) ACCOUNT_CREATION (APPROVED):**

```json
{
  "success": true,
  "message": "Onboarding state retrieved successfully.",
  "data": {
    "currentStep": "ACCOUNT_CREATION",
    "verificationStatus": "APPROVED",
    "verificationRequest": {
      "id": "verification-uuid",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "studentId": "41213012345"
    },
    "note": null
  }
}
```

**f) COMPLETED:**

```json
{
  "success": true,
  "message": "Onboarding state retrieved successfully.",
  "data": {
    "currentStep": "COMPLETED",
    "verificationStatus": "APPROVED",
    "verificationRequest": {
      "id": "verification-uuid",
      "name": "John Doe"
    },
    "note": null
  }
}
```

#### Test Cases:

| #   | Scenario                          | Expected Status | Notes                            |
| --- | --------------------------------- | --------------- | -------------------------------- |
| 1   | First time visitor (no cookie)    | 200 OK          | Returns `VERIFICATION_FORM` step |
| 2   | With valid onboarding_step cookie | 200 OK          | Returns current step status      |
| 3   | After onboarding completed        | 200 OK          | Returns `COMPLETED` step         |

---

## Verification Flow

### 2. Create Verification Request

**Request Name in Postman:** `Verification - Create Request [PENDING]`

- **Method:** `POST`
- **URL:** `{{base_url}}/verification/request`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (raw JSON):**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "2000-05-15",
    "studentId": "41213012345",
    "idCardImage": "https://example.com/id-card.jpg"
  }
  ```

**Description:** Submit a verification request to create a new account. Must be called before account creation.

#### Student ID Format

| Position | Length   | Description     | Example     |
| -------- | -------- | --------------- | ----------- |
| 1-2      | 2 digits | Department code | 41 (CSE)    |
| 3-4      | 2 digits | Admission year  | 21 (2021)   |
| 5-6      | 1 digit  | Intake year     | 3           |
| 7-8      | 2 digits | Semester code   | 10 (Spring) |
| 9-11     | 3 digits | Serial number   | 123         |

#### Valid Department Codes:

- `41` - CSE (Computer Science & Engineering)
- `42` - ECSE (Electronics & Communications)
- `43` - EEE (Electrical & Electronic Engineering)
- `44` - EEEE (Electrical & Electronic Engineering)
- `45` - BBA (Business Administration)
- `46` - MBA (Business Administration)
- `47` - ENGLISH
- `48` - MAE (Mechanical Engineering)
- `49` - BANGLA
- `50` - MAB
- `51` - LLB
- `52` - MPH
- `53` - BPH
- `54` - ME
- `55` - CIVIL
- `56` - BTX
- `57` - EBTX

#### Semester Codes:

- `10` - SPRING
- `20` - SUMMER
- `30` - FALL

#### Test Cases:

| #   | Scenario                       | Request Body                 | Expected Status      | Notes                                   |
| --- | ------------------------------ | ---------------------------- | -------------------- | --------------------------------------- |
| 1   | Valid request                  | Valid data                   | 201 Created          | Sets `onboarding_step` cookie           |
| 2   | Missing name                   | `{"email": "..."}`           | 400 Bad Request      | "Name is required" or validation error  |
| 3   | Short name (1 char)            | `{"name": "J"}`              | 400 Bad Request      | "Name must be at least 2 characters"    |
| 4   | Invalid email                  | `{"email": "invalid"}`       | 400 Bad Request      | "Invalid email address"                 |
| 5   | Future date of birth           | `"2099-01-01"`               | 400 Bad Request      | "Date of birth cannot be in the future" |
| 6   | Invalid student ID (10 digits) | `"studentId": "1234567890"`  | 400 Bad Request      | "Student ID must be exactly 11 digits"  |
| 7   | Invalid student ID (letters)   | `"studentId": "abcdefghijk"` | 400 Bad Request      | "Student ID must be exactly 11 digits"  |
| 8   | Invalid student ID format      | `"studentId": "99213012345"` | 400 Bad Request      | Invalid department code                 |
| 9   | Invalid ID card URL            | `"idCardImage": "not-a-url"` | 400 Bad Request      | "Invalid ID card image URL"             |
| 10  | Duplicate email                | Same email as existing       | 409 Conflict         | "Email already associated..."           |
| 11  | Duplicate student ID           | Same studentId as existing   | 200 OK / 201 Created | Returns existing or updates if rejected |

#### Sample Success Response (201):

```json
{
  "success": true,
  "message": "Verification request submitted successfully.",
  "data": {
    "currentStep": "ADMIN_REVIEW",
    "verificationStatus": "PENDING"
  }
}
```

**Important:** After this request, save the `onboarding_step` cookie value from the response. You'll need it for the account creation step.

---

### Frontend Polling Flow

After submitting a verification request, the frontend should implement the following flow:

```
POST /verification/request

    ↓

Navigate to Waiting page

    ↓

Periodically call (every 5-10 seconds)

GET /onboarding/current

    ↓

If PENDING
    Show waiting screen
    Continue polling

If APPROVED
    Redirect to Account Creation page

If REJECTED
    Show rejection note
    Provide "Edit and Resubmit" button

If COMPLETED
    Redirect to Login page
```

This allows the frontend to reactively update the UI based on admin actions without requiring page refresh.

---

## Verification Management (Admin)

> **Note:** These endpoints require admin authentication. Login as an admin user first.

### 7. List Verification Requests

**Request Name in Postman:** `Verification - List Requests [ADMIN]`

- **Method:** `GET`
- **URL:** `{{base_url}}/verification?page=1&limit=10&status=PENDING&search=john&sortBy=createdAt&sortOrder=desc`
- **Headers:**
  ```
  Cookie: better-auth.session_token={{admin_session_token}}
  ```
- **Query Parameters:**

| Parameter   | Type   | Default   | Description                                   |
| ----------- | ------ | --------- | --------------------------------------------- |
| `page`      | number | 1         | Page number                                   |
| `limit`     | number | 10        | Items per page (max 100)                      |
| `status`    | string | -         | Filter by status: PENDING, APPROVED, REJECTED |
| `search`    | string | -         | Search by studentId, email, or name           |
| `sortBy`    | string | createdAt | Sort field                                    |
| `sortOrder` | string | desc      | Sort order: asc, desc                         |

#### Test Cases:

| #   | Scenario              | Expected Status   | Notes                    |
| --- | --------------------- | ----------------- | ------------------------ |
| 1   | Valid admin request   | 200 OK            | Returns paginated list   |
| 2   | Only pending requests | `?status=PENDING` | Filters correctly        |
| 3   | Search by name        | `?search=john`    | Returns matching results |
| 4   | Non-admin user        | Student session   | 403 Forbidden            |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "Verification requests retrieved successfully.",
  "data": {
    "data": [
      {
        "id": "verification-uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "studentId": "41213012345",
        "dateOfBirth": "2000-05-15T00:00:00.000Z",
        "idCardImage": "https://example.com/id-card.jpg",
        "status": "PENDING",
        "note": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "reviewedAt": null,
        "onboardingStep": {
          "step": "ADMIN_REVIEW"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 8. Get Single Verification Request

**Request Name in Postman:** `Verification - Get Request [ADMIN]`

- **Method:** `GET`
- **URL:** `{{base_url}}/verification/{{verification_request_id}}`
- **Headers:**
  ```
  Cookie: better-auth.session_token={{admin_session_token}}
  ```

#### Test Cases:

| #   | Scenario       | Expected Status | Notes                            |
| --- | -------------- | --------------- | -------------------------------- |
| 1   | Valid ID       | 200 OK          | Returns request details          |
| 2   | Invalid UUID   | 404 Not Found   | "Verification request not found" |
| 3   | Non-admin user | 403 Forbidden   | "Permission denied"              |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "Verification request retrieved successfully.",
  "data": {
    "id": "verification-uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "studentId": "41213012345",
    "dateOfBirth": "2000-05-15T00:00:00.000Z",
    "idCardImage": "https://example.com/id-card.jpg",
    "status": "PENDING",
    "note": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "reviewedAt": null,
    "reviewedBy": null,
    "onboardingStep": {
      "id": "onboarding-uuid",
      "step": "ADMIN_REVIEW"
    }
  }
}
```

---

### 9. Approve Verification Request

**Request Name in Postman:** `Verification - Approve Request [ADMIN]`

- **Method:** `PATCH`
- **URL:** `{{base_url}}/verification/{{verification_request_id}}/approve`
- **Headers:**
  ```
  Cookie: better-auth.session_token={{admin_session_token}}
  ```

#### Test Cases:

| #   | Scenario              | Expected Status | Notes                                   |
| --- | --------------------- | --------------- | --------------------------------------- |
| 1   | Valid pending request | 200 OK          | Status changes to APPROVED              |
| 2   | Already approved      | 400 Bad Request | "Only pending requests can be approved" |
| 3   | Rejected request      | 400 Bad Request | "Only pending requests can be approved" |
| 4   | Invalid ID            | 404 Not Found   | "Verification request not found"        |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "Verification request approved successfully.",
  "data": {
    "id": "verification-uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "studentId": "41213012345",
    "status": "APPROVED",
    "note": null,
    "reviewedAt": "2024-01-15T11:00:00.000Z",
    "reviewedBy": "admin-user-uuid",
    "onboardingStep": {
      "id": "onboarding-uuid",
      "step": "ACCOUNT_CREATION"
    }
  }
}
```

---

### 10. Reject Verification Request

**Request Name in Postman:** `Verification - Reject Request [ADMIN]`

- **Method:** `PATCH`
- **URL:** `{{base_url}}/verification/{{verification_request_id}}/reject`
- **Headers:**
  ```
  Content-Type: application/json
  Cookie: better-auth.session_token={{admin_session_token}}
  ```
- **Body (raw JSON):**
  ```json
  {
    "note": "ID card image is unclear. Please resubmit with a clearer photo."
  }
  ```

#### Test Cases:

| #   | Scenario         | Request Body    | Expected Status | Notes                                   |
| --- | ---------------- | --------------- | --------------- | --------------------------------------- |
| 1   | Valid rejection  | With note       | 200 OK          | Status: REJECTED, note saved            |
| 2   | Missing note     | `{}`            | 400 Bad Request | "Rejection note is required"            |
| 3   | Empty note       | `{"note": " "}` | 400 Bad Request | "Rejection note is required"            |
| 4   | Already rejected | Valid note      | 400 Bad Request | "Only pending requests can be rejected" |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "Verification request rejected successfully.",
  "data": {
    "id": "verification-uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "studentId": "41213012345",
    "status": "REJECTED",
    "note": "ID card image is unclear. Please resubmit with a clearer photo.",
    "reviewedAt": "2024-01-15T11:00:00.000Z",
    "reviewedBy": "admin-user-uuid",
    "onboardingStep": {
      "id": "onboarding-uuid",
      "step": "ADMIN_REVIEW"
    }
  }
}
```

---

## Account Creation

### 3. Create Account

**Request Name in Postman:** `Account - Create Account [STUDENT]`

- **Method:** `POST`
- **URL:** `{{base_url}}/account/create`
- **Headers:**
  ```
  Content-Type: application/json
  Cookie: onboarding_step={{onboarding_step_id}}
  ```
- **Body (raw JSON):**
  ```json
  {
    "password": "SecurePass123"
  }
  ```

**Description:** Create a student account after verification approval. Requires a valid `onboarding_step` cookie.

#### Completed Onboarding Behavior

After a successful `POST /account/create`:

- The `onboarding_step` cookie is **removed** from the response
- The onboarding session is **completed** (marked as finished in the database)
- Future requests to `GET /onboarding/current` will return:
  ```json
  {
    "success": true,
    "message": "Onboarding state retrieved successfully.",
    "data": {
      "currentStep": "COMPLETED",
      "verificationStatus": "APPROVED",
      "verificationRequest": { ... },
      "note": null
    }
  }
  ```
- A subsequent call (after cookie cleanup) will return:
  ```json
  {
    "success": true,
    "message": "Onboarding state retrieved successfully.",
    "data": {
      "hasActiveOnboarding": false,
      "currentStep": null
    }
  }
  ```

#### Test Cases:

| #   | Scenario                       | Request Body                    | Cookie            | Expected Status  | Notes                                    |
| --- | ------------------------------ | ------------------------------- | ----------------- | ---------------- | ---------------------------------------- |
| 1   | Valid account creation         | `{"password": "SecurePass123"}` | Valid step ID     | 201 Created      | Account created successfully             |
| 2   | Missing password               | `{}`                            | Valid step ID     | 400 Bad Request  | "Password must be at least 8 characters" |
| 3   | Short password                 | `{"password": "1234567"}`       | Valid step ID     | 400 Bad Request  | "Password must be at least 8 characters" |
| 4   | No onboarding cookie           | `{"password": "..."}`           | None              | 401 Unauthorized | "No onboarding session found"            |
| 5   | Invalid onboarding cookie      | `{"password": "..."}`           | Invalid UUID      | 404 Not Found    | "Onboarding session not found"           |
| 6   | Already completed step         | `{"password": "..."}`           | Completed step ID | 409 Conflict     | "Account already created"                |
| 7   | Wrong step (VERIFICATION_FORM) | `{"password": "..."}`           | Wrong step ID     | 400 Bad Request  | "Cannot create account at current stage" |
| 8   | Rejected verification          | `{"password": "..."}`           | Rejected step ID  | 400 Bad Request  | "Verification not approved"              |

#### Sample Success Response (201):

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "currentStep": "COMPLETED",
    "user": {
      "id": "uuid-here",
      "role": "STUDENT"
    }
  }
}
```

---

## Authentication Flow

### 4. Login

**Request Name in Postman:** `Auth - Login [STUDENT] - Success`

- **Method:** `POST`
- **URL:** `{{base_url}}/auth/sign-in/email`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (raw JSON):**
  ```json
  {
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }
  ```

**Description:** Login with email and password. Sets Better Auth session cookies for authentication.

#### Test Cases:

| #   | Scenario                | Request Body               | Expected Status  | Notes                       |
| --- | ----------------------- | -------------------------- | ---------------- | --------------------------- |
| 1   | Successful login (email) | Valid email + password     | 200 OK           | Returns user data + cookies |
| 2   | Missing email           | `{"password": "..."}`      | 400 Bad Request  | "Email is required"         |
| 3   | Missing password        | `{"email": "..."}`         | 400 Bad Request  | "Password is required"      |
| 4   | Invalid credentials     | Wrong credentials          | 401 Unauthorized | "Invalid credentials"       |
| 5   | Unverified email        | Unverified user            | 403 Forbidden    | "Please verify your email"  |
| 6   | Suspended account       | Suspended user             | 403 Forbidden    | "Account suspended"         |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "STUDENT",
      "status": "ACTIVE",
      "isDeleted": false
    },
    "student": {
      "id": "student-uuid",
      "studentId": "41213012345",
      "department": "CSE",
      "admissionYear": 2021,
      "admissionSemester": "SPRING",
      "dateOfBirth": "2000-05-15T00:00:00.000Z"
    },
    "admin": null
  }
}
```

---

### 5. Get Current User (Me)

**Request Name in Postman:** `Auth - Get Me [STUDENT]`

- **Method:** `GET`
- **URL:** `{{base_url}}/identity/me`
- **Headers:**
  ```
  Cookie: better-auth.session_token={{session_token}}
  ```
- **Cookies:** Must include session cookies from login response

#### Test Cases:

| #   | Scenario          | Expected Status  | Notes                        |
| --- | ----------------- | ---------------- | ---------------------------- |
| 1   | Valid session     | 200 OK           | Returns user data            |
| 2   | No session cookie | 401 Unauthorized | "Invalid or expired session" |
| 3   | Invalid session   | 401 Unauthorized | "Invalid or expired session" |
| 4   | Deleted user      | 403 Forbidden    | "Account has been deleted"   |
| 5   | Banned user       | 403 Forbidden    | "Account has been banned"    |
| 6   | Suspended user    | 403 Forbidden    | "Account is suspended"       |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "User retrieved successfully.",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "STUDENT",
      "status": "ACTIVE",
      "isDeleted": false
    },
    "student": {
      "id": "student-uuid",
      "studentId": "41213012345",
      "department": "CSE",
      "admissionYear": 2021,
      "admissionSemester": "SPRING",
      "dateOfBirth": "2000-05-15T00:00:00.000Z"
    },
    "admin": null
  }
}
```

---

### 6. Logout

**Request Name in Postman:** `Auth - Logout [STUDENT]`

- **Method:** `POST`
- **URL:** `{{base_url}}/auth/logout`
- **Headers:**
  ```
  Cookie: better-auth.session_token={{session_token}}
  ```

#### Test Cases:

| #   | Scenario          | Expected Status  | Notes                        |
| --- | ----------------- | ---------------- | ---------------------------- |
| 1   | Valid session     | 200 OK           | Session cleared              |
| 2   | No session cookie | 401 Unauthorized | "Invalid or expired session" |

#### Sample Success Response (200):

```json
{
  "success": true,
  "message": "Logout successful."
}
```

---

## Postman Collection Structure

Create a Postman collection with the following folder structure:

```
Smart NUB Campus API
├── 🟢 Onboarding
│   └── Onboarding - Get Current Step
│
├── 🔵 Verification (Public)
│   └── Verification - Create Request [PENDING]
│
├── 🔴 Verification (Admin)
│   ├── Verification - List Requests [ADMIN]
│   ├── Verification - Get Request [ADMIN]
│   ├── Verification - Approve Request [ADMIN]
│   └── Verification - Reject Request [ADMIN]
│
├── 🟡 Account (Protected)
│   └── Account - Create Account [STUDENT]
│
└── 🟣 Authentication
    ├── Auth - Login [STUDENT] - Success
    ├── Auth - Login [STUDENT] - Invalid Credentials
    ├── Auth - Get Me [STUDENT]
    └── Auth - Logout [STUDENT]
```

---

## Environment Variables

Set up these environment variables in Postman:

| Variable                  | Value                          | Description                     |
| ------------------------- | ------------------------------ | ------------------------------- |
| `base_url`                | `http://localhost:5000/api/v1` | API base URL                    |
| `onboarding_step_id`      | (auto-filled)                  | Saved from verification request |
| `session_token`           | (auto-filled)                  | Saved from login response       |
| `admin_session_token`     | (auto-filled)                  | Admin login session             |
| `verification_request_id` | (auto-filled)                  | From list or create response    |

---

## Testing Scripts

### Extract Onboarding Step Cookie (post-execution script for Create Verification Request):

```javascript
// Extract onboarding_step cookie from response
const cookies = pm.response.headers.get("Set-Cookie");
if (cookies && cookies.includes("onboarding_step=")) {
  const match = cookies.match(/onboarding_step=([^;]+)/);
  if (match) {
    pm.environment.set("onboarding_step_id", match[1]);
    console.log("Saved onboarding_step_id:", match[1]);
  }
}
```

### Extract Session Token (post-execution script for Login):

```javascript
// Extract better-auth session token
const cookies = pm.response.headers.get("Set-Cookie");
if (cookies && cookies.includes("better-auth.session_token=")) {
  const match = cookies.match(/better-auth\.session_token=([^;]+)/);
  if (match) {
    pm.environment.set("session_token", match[1]);
    console.log("Saved session_token:", match[1]);
  }
}
```

### Extract Verification Request ID (post-execution script for Create Verification Request):

```javascript
// Extract verification request ID from response
const jsonData = pm.response.json();
if (jsonData.data && jsonData.data.verificationRequest) {
  pm.environment.set(
    "verification_request_id",
    jsonData.data.verificationRequest.id,
  );
  console.log(
    "Saved verification_request_id:",
    jsonData.data.verificationRequest.id,
  );
}
```

---

## Complete Test Flows

### Flow 1: New Student Registration

1. **GET** `/onboarding/current` → Verify initial state (VERIFICATION_FORM)
2. **POST** `/verification/request` → Submit verification, save `onboarding_step_id` cookie
3. **Admin** approves request via `/verification/{{verification_request_id}}/approve`
4. **POST** `/account/create` with saved cookie → Create account, cookie removed
5. **POST** `/auth/sign-in/email` → Login and save `session_token`
6. **GET** `/identity/me` → Verify session
7. **POST** `/auth/sign-out` → End session

### Flow 2: Duplicate Email/Student ID

1. **POST** `/verification/request` with existing email → 409 Conflict
2. **POST** `/verification/request` with rejected student ID → 200 OK (resubmission allowed)

### Flow 3: Rejected Verification Resubmission (Improved)

1. **POST** `/verification/request` with rejected student ID → Returns existing onboarding step
2. **GET** `/onboarding/current` with saved `onboarding_step_id` → See rejected status with note
3. **User** edits information in the frontend form
4. **POST** `/verification/request` again → Updates to PENDING
5. **Admin** approves the resubmitted request

### Flow 4: Admin Verification Management

1. **POST** `/auth/sign-in/email` as admin → Get `admin_session_token`
2. **GET** `/verification` → List all requests
3. **PATCH** `/verification/{{verification_request_id}}/approve` → Approve request
4. **GET** `/verification/{{verification_request_id}}` → Verify approval status
