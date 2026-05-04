# TradeStack CRM — Admin Integration Prompt

Copy and paste this entire prompt into your main admin site's Replit Agent chat to add CRM user management.

---

## PROMPT (COPY EVERYTHING BELOW THIS LINE)

---

I need to add a "CRM User Management" section to my admin panel that connects to an external TradeStack CRM API. This lets me create, view, and delete CRM accounts for my customers, and reset their passwords.

### How it works

The CRM is a separate deployed Replit app. It has admin API endpoints secured with an API key. My admin site will call these endpoints to manage users.

### CRM API Details

**Base URL:** `[PASTE YOUR CRM's DEPLOYED URL HERE, e.g. https://your-crm-app.replit.app]`

**Authentication:** Every request must include this header:
```
x-admin-api-key: [PASTE YOUR ADMIN_API_KEY HERE]
```

Store the base URL and API key as environment variables:
- `CRM_BASE_URL` — the deployed CRM URL (e.g. `https://your-crm-app.replit.app`)
- `CRM_ADMIN_API_KEY` — the admin API key

### API Endpoints

**1. Create a user**
```
POST {CRM_BASE_URL}/api/admin/users
Header: x-admin-api-key: {CRM_ADMIN_API_KEY}
Content-Type: application/json

Body:
{
  "email": "username_or_email",
  "password": "initial_password",
  "businessName": "Customer Business Name"
}

Response (201):
{
  "id": 3,
  "email": "username_or_email",
  "businessName": "Customer Business Name",
  "createdAt": "2026-05-04T00:00:00.000Z"
}

Error (409): { "error": "An account with this email already exists" }
Error (400): { "error": "email, password, and businessName are required" }
```

**2. List all users**
```
GET {CRM_BASE_URL}/api/admin/users
Header: x-admin-api-key: {CRM_ADMIN_API_KEY}

Response (200):
[
  {
    "id": 1,
    "email": "user1",
    "businessName": "Biz Name",
    "createdAt": "2026-05-04T00:00:00.000Z"
  }
]
```

**3. Delete a user**
```
DELETE {CRM_BASE_URL}/api/admin/users/{id}
Header: x-admin-api-key: {CRM_ADMIN_API_KEY}

Response (200): { "success": true, "deletedId": 1 }
Error (404): { "error": "User not found" }
```

**4. Reset a user's password (admin)**
```
PATCH {CRM_BASE_URL}/api/admin/users/{id}/password
Header: x-admin-api-key: {CRM_ADMIN_API_KEY}
Content-Type: application/json

Body:
{
  "password": "new_password_here"
}

Response (200): { "success": true, "id": 1, "email": "user1" }
Error (400): { "error": "Password must be at least 6 characters" }
```

### What to build

1. **A "CRM Users" page in my admin panel** with:
   - A table showing all CRM users (email, business name, date created)
   - A "Create CRM Account" button/form with fields: email/username, password, business name
   - A "Reset Password" button on each row that opens a form to set a new password
   - A "Delete" button on each row with confirmation dialog
   - Success/error toast notifications for all actions

2. **Backend proxy routes** (so the admin API key stays server-side, never exposed to the browser):
   - `GET /api/crm-admin/users` — proxies to CRM list users
   - `POST /api/crm-admin/users` — proxies to CRM create user
   - `DELETE /api/crm-admin/users/:id` — proxies to CRM delete user
   - `PATCH /api/crm-admin/users/:id/password` — proxies to CRM reset password

   Each proxy route should read `CRM_BASE_URL` and `CRM_ADMIN_API_KEY` from environment variables and forward the request to the CRM API with the `x-admin-api-key` header.

3. **Important notes:**
   - The email field is a text field (not email-validated) — usernames like "test" are allowed
   - Passwords must be at least 6 characters
   - The CRM hashes passwords with bcrypt — you send plain text, it stores it hashed
   - Users log into the CRM at its own URL with the credentials you create for them
   - The CRM login URL will be: `{CRM_BASE_URL}/crm/`

### For each new site I remix from the CRM template

Each remixed CRM site will have its own:
- Deployed URL (different `CRM_BASE_URL`)
- Its own `ADMIN_API_KEY` (set in that site's environment variables)
- Its own database with its own users

So in my admin panel, I may eventually want to manage multiple CRM instances. For now, just connect to one. I can add more later by making the base URL and API key configurable per customer/site.

---

## END OF PROMPT

---

## Setup Checklist (for you, not part of the prompt)

1. Deploy this CRM site (publish it on Replit)
2. Copy the deployed URL (e.g. `https://your-crm-app.replit.app`)
3. Copy your ADMIN_API_KEY from this site's Secrets/Environment Variables tab
4. Go to your main admin site on Replit
5. Add these as environment variables on your admin site:
   - `CRM_BASE_URL` = your deployed CRM URL
   - `CRM_ADMIN_API_KEY` = the key from step 3
6. Paste the prompt above into Agent chat
7. Done! You can now create CRM accounts from your admin panel

## Users can change their own password

Once logged into the CRM, users can change their own password via:
```
PATCH {CRM_BASE_URL}/api/auth/password
Cookie: token=... (automatic, they're logged in)
Content-Type: application/json

Body:
{
  "currentPassword": "their_current_password",
  "newPassword": "their_new_password"
}
```

This is already built into the CRM — you just need to add a "Change Password" button in the CRM's settings/profile page if you want (it's not there yet, but the API is ready).
