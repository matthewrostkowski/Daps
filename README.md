# 🏀 Daps

At **Daps**, we're redefining the fan experience by connecting enthusiasts directly with their favorite athletes. Our platform empowers fans to request personalized memorabilia and unique experiences, bridging the gap between admiration and access.

Through Daps, fans can:

* **Bid on Game-Worn memorabilia** straight off the back of their favorite athletes.
* **Request custom autographs, messages, or memorabilia** directly from athletes.
* **Engage in exclusive experiences**, from meeting your favorite athlete courtside to behind-the-scenes access.
* **Participate in a dynamic marketplace** where demand drives offerings, ensuring fans get exactly what they desire.

For athletes, Daps offers a streamlined platform to monetize their brand, connect authentically with fans, and manage requests efficiently.

Backed by industry leaders and featured in prominent publications like *Sports Illustrated*, Daps is at the forefront of fan-athlete engagement.

**Join us in revolutionizing the way fans and athletes connect.**

---

# Daps

Daps is a Node/Express + Prisma backend with pages for admin, user, offers, and more. The server exposes JSON APIs (e.g., `/api/athletes`, `/api/users/*`) and serves static assets from `public/`.
Frontend pages live in `server/` (`admin.html`, `index.html`, `my-offers.html`, `user.html`, etc).

---

## 🧠 Features of Daps

* **Account Management** – Users can create, verify, and log into accounts securely using JWT-based authentication and email verification (`user.html`).
* **Offer Submissions** – Fans can make offers on athlete experiences directly through the UI, specifying bid amounts, event types, and descriptions.
* **Offer Tracking Dashboard** – The “My Offers” page displays offer history with filtering (Pending, Approved, Declined), dynamic rendering, and timestamping (`my-offers.html`).
* **Admin Panel** – Admins can approve or reject offers, manage athlete profiles, and send templated emails directly from the dashboard (`admin.html`).
* **Automated Notifications** – Email updates are sent automatically for account verification, password resets, and offer status changes (`email.js`).
* **Logging and Debugging** – All backend actions log cleanly to the console (API requests, SMTP verification, server routing, offer updates) with consistent formatting for tracing and debugging (`app.js`).

---

## 👤 User Flow

1. **Landing Page (`index.html`)** – Users browse active athletes and game-day experiences and select one to make an offer.
2. **Sign Up / Login (`user.html`)** – Users create accounts with email verification; JWTs are stored locally for secure sessions.
3. **Submit Offer** – Logged-in users can submit offers tied to specific athletes and experiences.
4. **View My Offers (`my-offers.html`)** – Users view all offers with their statuses (Pending/Approved/Declined) in an interactive dashboard.
5. **Admin Portal (`admin.html`)** – Admin logs in securely to manage athletes, review offers, and send approval/decline emails directly.
6. **Automated Communication** – `email.js` handles verification and offer updates automatically through Nodemailer integration.

---

## Tech stack

* Node 18+ / Express, CORS, JWT auth, Nodemailer, Prisma client.
* Static assets served via Express + `public/`.

---

## Repo layout (top-level)

```
/public/js/frontend-hooks.js
/server/*.html, /server/images, /server/src/*, /server/prisma/*
```

(See `file_structure.txt` for a full tree.)

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

* **PORT** (default 5175) – optional
* **DATABASE_URL** – Postgres connection string (for Prisma)
* **SESSION_SECRET** – JWT signing secret for user sessions
* **SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM** – for transactional email
* **PUBLIC_BASE_URL** – public URL used in verification/reset links

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

* `GET /api/athletes` and `GET /api/users/athletes` – list athletes
* `POST /api/users/login` – returns a JWT on success. Use `Authorization: Bearer <token>` for protected routes
* `GET /api/users/me` – example protected route

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

* **Secrets:** keep all credentials in `server/.env`. Only `.env.example` is committed.
* **Logs:** request logging is enabled (method, path, body for write ops). Avoid logging secrets in routes.
* **Images:** `/images/placeholder.jpg` has a tiny fallback to prevent noisy 404 loops.
* **Do not commit:** `server/node_modules/` or `server/cookies.txt`—they’re local artifacts. (See `file_structure.txt`.)

---

## 10) AI

AI assistance was used to:

* **Normalize formatting** and **add inline comments** for clarity and maintainability.
* **Harden logging and error messages** for debugging without exposing sensitive data.
* **Refactor small utilities** (e.g., image fallback, auth helpers) with human review for accuracy and security.
* **Generate boilerplate routes and emails**, edited for correctness (JWT, SMTP).
* **Standardize variable naming** and documentation style across modules.
* **Write this README.**

---

## 11) Troubleshooting

* **401 on protected routes** → ensure you’re sending `Authorization: Bearer <token>` from `/api/users/login`.
* **Email not sending** → verify SMTP credentials and app passwords.
* **Images 404 spam** → placeholder handling is intentional; ensure your `public/images` paths are valid.
