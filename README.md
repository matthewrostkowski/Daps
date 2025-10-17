# Daps

Daps is a Node/Express + Prisma backend with static pages for admin, user, and offers. The server exposes JSON APIs (e.g., `/api/athletes`, `/api/users/*`) and serves static assets from `public/`.   Frontend pages live in `server/` (`admin.html`, `index.html`, `my-offers.html`, `user.html`, etc).    

## Tech stack

* Node 18+ / Express, CORS, JWT auth, Nodemailer, Prisma client.   
* Static assets via Express + `public/`. 

## Repo layout (top-level)

```
/public/js/frontend-hooks.js
/server/*.html, /server/images, /server/src/*, /server/prisma/*
```

(See `file_structure.txt` for a fuller tree.) 

---

## 1) Prerequisites

* **Node** v18+ and **npm**
* **PostgreSQL** running locally (or remote)
* **Git** access to this repo

---

## 2) Clone

```bash
git clone https://github.com/<org-or-user>/Daps.git
cd Daps
```

---

## 3) Environment variables (copy & fill)

Create the server runtime env from the example template:

```bash
# from repo root:
cp .env.example server/.env
```

Required vars (fill with real values):

* **PORT** (default 5175) – optional. 
* **DATABASE_URL** – Postgres connection string (for Prisma).
* **SESSION_SECRET** – JWT signing secret for user sessions. 
* **SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM** – for transactional email. 
* **PUBLIC_BASE_URL** – public URL used in verification/reset links. 

> Never commit `server/.env`. Only the placeholder `.env.example` is tracked.

---

## 4) Install & DB setup

```bash
cd server
npm ci
# bring schema to the DB (use one of the following depending on your setup)
npx prisma migrate deploy || npx prisma db push
```

(Optional) Seed starter data if needed:

```bash
node src/seed-athletes.js
```

(If there’s an npm script, you can use `npm run seed` instead.) 

---

## 5) Run the server

```bash
# inside /server
npm run dev   # if defined
# otherwise:
node src/app.js
```

The API will start on `http://localhost:5175` (unless you set `PORT`). Static assets are served from `/public`, and `/images` is mapped (with a tiny 1×1 fallback to avoid 404 spam). 

**Key endpoints**

* `GET /api/athletes` and `GET /api/users/athletes` – list athletes. 
* `POST /api/users/login` – returns a JWT on success. Use `Authorization: Bearer <token>` for protected routes.  
* `GET /api/users/me` – example protected route.  

**Static pages**

* `server/index.html`, `server/my-offers.html`, `server/user.html`, `server/admin.html` can be opened directly or served via a static server for local testing.    

---

## 6) Email (development)

On boot or when sending mail, the app creates/verifies a Nodemailer SMTP transport using your env vars. If SMTP isn’t configured, verification will fail but the server can still run; set real SMTP to test verification and password-reset flows. 

---

## 7) Auth model (quick note)

User sessions are JWTs signed with `SESSION_SECRET`. Protected routes expect `Authorization: Bearer <token>`. If the token is missing/invalid, the server returns 401. 

---

## 8) Common tasks

```bash
# lint (if configured)
npm run lint

# run tests (if any)
npm test
```

---

## 9) Security & operational hygiene

* **Secrets**: keep all credentials in `server/.env`. Only `.env.example` is committed.
* **Logs**: request logging is enabled (method, path, body for write ops). Avoid logging secrets in routes. 
* **Images**: `/images/placeholder.jpg` has a tiny fallback to prevent noisy 404 loops. 
* **Do not commit** `server/node_modules/` or `server/cookies.txt`—they’re local artifacts. (See `file_structure.txt`.) 

---

## 10) AI

Used AI assistants to:

* **Normalize formatting** and **add inline comments** for readability/maintainability.
* **Harden logging** and error messages to make debugging faster without leaking secrets. 
* **Refactor small utilities** (e.g., tiny image fallback, cleaner auth helpers), keeping business logic intact and reviewed by a human.  
* **Generate boilerplate** for routes and emails, then human-edited for correctness and security (JWT handling, SMTP).
* **Standerize the code base/vars**
* **Write this README**
 



---

## 11) Troubleshooting

* **401 on protected routes** → make sure you’re sending `Authorization: Bearer <token>` from `/api/users/login`. 
* **Email not sending** → verify SMTP env vars and that your provider allows the credentials. 
* **Images 404 spam** → server intentionally serves a 1×1 PNG fallback; verify your `public/images` paths if you want the real asset. 

---

