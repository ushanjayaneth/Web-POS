# ShopLK Workspace

This repository contains three separate apps that work together:

| Folder | Purpose | Common commands |
| --- | --- | --- |
| `backend` | Express API and Firebase Admin integration | `npm run dev:backend` |
| `frontend` | Customer ecommerce storefront | `npm run dev:frontend` |
| `admin-pos` | Admin and point-of-sale dashboard | `npm run dev:admin` |

## Quick Start

Install dependencies for all apps:

```bash
npm run install:all
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`:

```bash
npm.cmd run install:all
```

Run each app from the repository root:

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:admin
```

Build both frontend apps:

```bash
npm run build
```

## Project Layout

```text
.
|-- backend/      Express API, routes, middleware, database setup
|-- frontend/     Customer-facing React/Vite app
|-- admin-pos/    Admin POS React/Vite app
`-- database.rules.json
```

Generated folders such as `node_modules`, `dist`, local `.env` files, uploads, and Firebase service account keys should stay out of Git. They are ignored from the repository root.

## Security Setup

Backend secrets must be configured outside Git:

```bash
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app/
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
ADMIN_EMAILS=owner@example.com,manager@example.com
ADMIN_FRONTEND_URL=https://your-admin-app.example.com
```

For local development, `backend/serviceAccountKey.json` is supported, but it must not be committed.

Admin access is allowed when one of these is true:

- The Firebase Auth email is listed in `ADMIN_EMAILS`.
- The Firebase Auth UID is listed in `ADMIN_UIDS`.
- The Realtime Database has `admins/<firebase-uid>/active` set to `true`.
- The matching `users/<firebase-uid>` record has an active staff role.

Product and POS sale writes now go through `backend/routes/admin.js`, where the backend verifies the Firebase admin session, validates the product fields, calculates sale totals from trusted product data, and updates stock.

## GitHub and Vercel Deployment

For a new GitHub account, create a new empty repository and push a clean history from this workspace. Do not push the old Git history because older commits contained sensitive Firebase material.

Recommended Vercel setup uses three projects from the same GitHub repository:

| Vercel project | Root directory | Build command | Output |
| --- | --- | --- | --- |
| Backend API | `backend` | leave default | Serverless API |
| Storefront | `frontend` | `npm run build` | `dist` |
| Admin POS | `admin-pos` | `npm run build` | `dist` |

Backend environment variables:

```bash
NODE_ENV=production
FRONTEND_URL=https://your-storefront.vercel.app
ADMIN_FRONTEND_URL=https://your-admin-pos.vercel.app
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app/
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
ADMIN_EMAILS=owner@example.com
```

Storefront environment variables:

```bash
VITE_API_URL=https://your-backend-api.vercel.app/api
```

Admin POS environment variables:

```bash
VITE_ADMIN_API_URL=https://your-backend-api.vercel.app/api
```

After backend deployment, update `FRONTEND_URL`, `ADMIN_FRONTEND_URL`, `VITE_API_URL`, and `VITE_ADMIN_API_URL` with the real Vercel URLs, then redeploy the affected projects.
