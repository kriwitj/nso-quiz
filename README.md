# nso-quiz

ระบบ Quiz แบบ Real-time สำหรับสำนักงานสถิติแห่งชาติ (NSO)  
Deploy ที่ **https://province-stat.nso.go.th/nso-quiz**

---

## สถาปัตยกรรม

```
province-stat.nso.go.th
        │
        ▼
  [ Traefik Reverse Proxy ]  (ที่มีอยู่บน host)
        │
        ├─── /nso-quiz/api/auth/*  ──► quiz_web  :3000  (NextAuth — Next.js handles this)
        ├─── /nso-quiz/api/*       ──► quiz_api  :4000  (NestJS API, strip /nso-quiz prefix)
        ├─── /nso-quiz/socket.io   ──► quiz_api  :4000  (Socket.io WebSocket, strip prefix)
        └─── /nso-quiz/*           ──► quiz_web  :3000  (Next.js App, basePath built-in)
```

### Services

| Container      | Image             | Port (internal) | หน้าที่                          |
|----------------|-------------------|-----------------|----------------------------------|
| `quiz_web`     | Next.js 15        | 3000            | Frontend + NextAuth              |
| `quiz_api`     | NestJS 10         | 4000            | REST API + WebSocket (Socket.io) |
| `quiz_postgres`| PostgreSQL 16     | 5432            | Database                         |
| `quiz_redis`   | Redis 7           | 6379            | Session / Cache                  |
| `quiz_minio`   | MinIO             | 9000 / 9001     | Object Storage (S3-compatible)   |

### Stack

- **Frontend** — Next.js 15 (App Router), React 19, TailwindCSS, Framer Motion
- **Backend** — NestJS 10, Prisma ORM, Passport.js (JWT + Google OAuth)
- **Real-time** — Socket.io (WebSocket / long-polling)
- **Monorepo** — npm workspaces + Turborepo
- **Infra** — Docker Compose, Traefik (existing), PostgreSQL, Redis, MinIO

---

## ข้อกำหนดก่อน Deploy

1. Docker Engine ≥ 24 และ Docker Compose v2
2. Traefik กำลังทำงานบน host และมี external network ชื่อ `proxy_net`
3. DNS `province-stat.nso.go.th` ชี้มายัง server นี้
4. TLS certificate ถูกจัดการโดย Traefik (Let's Encrypt หรือ manual)

สร้าง external network ครั้งเดียว (ถ้ายังไม่มี):

```bash
docker network create proxy_net
```

---

## การ Deploy Production

### 1. Clone และตั้งค่า Environment

```bash
git clone <repo-url> nso-quiz
cd nso-quiz
cp .env.example .env
```

แก้ไข `.env` ด้วย editor ของคุณ:

```bash
nano .env
```

ค่าที่ **ต้องแก้** ก่อน deploy:

```env
# ── Database ──────────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=<รหัสผ่านที่แข็งแกร่ง>

# ── Security ──────────────────────────────────────────────────────────────────
JWT_SECRET=<สุ่มด้วย: openssl rand -hex 32>
JWT_REFRESH_SECRET=<สุ่มด้วย: openssl rand -hex 32>
NEXTAUTH_SECRET=<สุ่มด้วย: openssl rand -hex 32>

# ── URL (ต้องใส่ basePath ด้วย) ───────────────────────────────────────────────
NEXTAUTH_URL=https://province-stat.nso.go.th/nso-quiz
NEXT_PUBLIC_API_URL=https://province-stat.nso.go.th/nso-quiz/api
NEXT_PUBLIC_WS_URL=https://province-stat.nso.go.th
FRONTEND_URL=https://province-stat.nso.go.th
GOOGLE_CALLBACK_URL=https://province-stat.nso.go.th/nso-quiz/api/auth/google/callback
MINIO_PUBLIC_URL=https://province-stat.nso.go.th:9000   # หรือ URL ที่เข้าถึง MinIO ได้

# ── Base Path (ต้องตรงกัน — baked ลงใน bundle ตอน build) ──────────────────────
BASE_PATH=/nso-quiz
NEXT_PUBLIC_BASE_PATH=/nso-quiz
```

### 2. Build และ Start

```bash
docker compose up -d --build
```

ตรวจสอบ logs:

```bash
docker compose logs -f web api
```

### 3. ตรวจสอบสถานะ

```bash
docker compose ps
```

ทุก service ควรเป็น `healthy`:

```
NAME             STATUS
quiz_api         Up (healthy)
quiz_minio       Up (healthy)
quiz_postgres    Up (healthy)
quiz_redis       Up (healthy)
quiz_web         Up (healthy)
```

### 4. เข้าใช้งาน

- **Web App**: https://province-stat.nso.go.th/nso-quiz
- **API Health**: https://province-stat.nso.go.th/nso-quiz/api/health
- **API Docs**: https://province-stat.nso.go.th/nso-quiz/api/docs _(Swagger)_
- **MinIO Console**: http://server-ip:9001

---

## การ Deploy Development (Local)

```bash
cp .env.example .env
# แก้ BASE_PATH= (ว่างเปล่า) สำหรับ local
```

แก้ `.env` ให้ BASE_PATH ว่าง:

```env
BASE_PATH=
NEXT_PUBLIC_BASE_PATH=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

```bash
# Dev mode ด้วย Turbo (hot reload)
npm install
npm run dev

# หรือ Docker (production build, local)
docker compose up -d --build
```

---

## โครงสร้างโปรเจกต์

```
nso-quiz-antigravity/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/      # auth, quiz, sessions, analytics, admin
│   │   │   ├── gateways/     # Socket.io game gateway
│   │   │   └── main.ts
│   │   ├── prisma/           # Database schema + migrations
│   │   └── Dockerfile
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/          # App Router pages
│       │   ├── components/
│       │   ├── lib/          # api.ts, auth.ts, socket.ts
│       │   └── stores/
│       ├── next.config.ts    # basePath configured here
│       └── Dockerfile
├── packages/
│   └── shared/               # Types, enums, events shared between apps
├── docker-compose.yml        # Production compose (Traefik labels included)
├── .env.example
└── turbo.json
```

---

## Environment Variables อ้างอิงครบ

| Variable | Development | Production |
|----------|-------------|------------|
| `BASE_PATH` | _(empty)_ | `/nso-quiz` |
| `NEXT_PUBLIC_BASE_PATH` | _(empty)_ | `/nso-quiz` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://province-stat.nso.go.th/nso-quiz` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | `https://province-stat.nso.go.th/nso-quiz/api` |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:4000` | `https://province-stat.nso.go.th` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://province-stat.nso.go.th` |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/auth/google/callback` | `https://province-stat.nso.go.th/nso-quiz/api/auth/google/callback` |

> **หมายเหตุ**: `BASE_PATH` และ `NEXT_PUBLIC_BASE_PATH` ถูก bake เข้าไปใน Next.js bundle ตอน Docker build — ถ้าเปลี่ยนค่าต้อง rebuild image ใหม่

---

## Traefik Routing ที่ตั้งไว้

| Router | Rule | Priority | Destination | Middleware |
|--------|------|----------|-------------|------------|
| `quiz-web-auth` | `PathPrefix(/nso-quiz/api/auth)` | 30 | web:3000 | — |
| `quiz-ws` | `PathPrefix(/nso-quiz/socket.io)` | 25 | api:4000 | StripPrefix `/nso-quiz` |
| `quiz-api` | `PathPrefix(/nso-quiz/api)` | 20 | api:4000 | StripPrefix `/nso-quiz` |
| `quiz-web` | `PathPrefix(/nso-quiz)` | 10 | web:3000 | — |

**เหตุผลการตั้ง Priority:**
- `quiz-web-auth` (30) — NextAuth อยู่ใน Next.js ไม่ใช่ NestJS ต้องดัก `/api/auth/*` ก่อน
- `quiz-ws` (25) — Socket.io ต้องรับ WebSocket upgrade ก่อน `/api` rule จะดัก
- `quiz-api` (20) — NestJS รับ REST calls ทั้งหมดที่เหลือ (prefix ถูกลบออกก่อนส่งต่อ)
- `quiz-web` (10) — Next.js รับทุกอย่างที่เหลือ (built-in basePath จัดการ routing เอง)

---

## คำสั่งที่ใช้บ่อย

```bash
# ดู logs realtime
docker compose logs -f web
docker compose logs -f api

# Restart service เดียว
docker compose restart web

# Rebuild และ redeploy service เดียว
docker compose up -d --build web

# เข้า shell ใน container
docker compose exec api sh
docker compose exec web sh

# ดู database
docker compose exec postgres psql -U postgres -d quizdb

# Database migrations (ทำอัตโนมัติตอน API start)
docker compose exec api npx prisma migrate deploy

# หยุดทั้งหมด (เก็บ volumes)
docker compose down

# หยุดและลบ volumes (ข้อมูลหาย!)
docker compose down -v
```

---

## การเปลี่ยน Base Path ในอนาคต

ถ้าต้องการย้ายไป path อื่น เช่น `/quiz`:

1. แก้ `.env`:
   ```env
   BASE_PATH=/quiz
   NEXT_PUBLIC_BASE_PATH=/quiz
   NEXTAUTH_URL=https://province-stat.nso.go.th/quiz
   NEXT_PUBLIC_API_URL=https://province-stat.nso.go.th/quiz/api
   ```

2. Rebuild:
   ```bash
   docker compose up -d --build web
   ```

ไม่ต้องแก้โค้ดอื่นเพิ่มเติม — ทุกอย่างอ้างอิง `BASE_PATH` จาก env เดียว

---

## Troubleshooting

**Static assets ไม่โหลด (404)**  
→ ตรวจว่า `BASE_PATH` ถูก set เป็น build arg ใน docker-compose.yml และ image ถูก rebuild แล้ว

**Refresh หน้าแล้ว 404**  
→ ตรวจ Traefik rule `quiz-web` ครอบคลุม `PathPrefix(/nso-quiz)` ถูกต้อง

**Socket.io ต่อไม่ได้ (WebSocket 404/403)**  
→ ตรวจว่า `quiz-ws` router ใน Traefik labels ทำงานอยู่  
→ ตรวจ `NEXT_PUBLIC_WS_URL` ไม่มี path (ใส่แค่ hostname)  
→ ตรวจ CORS: `FRONTEND_URL` ต้องตรงกับ origin ของ browser

**Login redirect วน (redirect loop)**  
→ ตรวจ `NEXTAUTH_URL` ต้องมี basePath ด้วย: `https://province-stat.nso.go.th/nso-quiz`

**API ส่ง 403 (CORS)**  
→ ตรวจ `FRONTEND_URL=https://province-stat.nso.go.th` (ไม่มี path)

**Google OAuth ใช้ไม่ได้**  
→ ตรวจ Authorized redirect URI ใน Google Console:  
  `https://province-stat.nso.go.th/nso-quiz/api/auth/callback/google`

---

## Health Checks

| Endpoint | Container | ตรวจอะไร |
|----------|-----------|---------|
| `GET /nso-quiz` | quiz_web:3000 | Next.js up |
| `GET /nso-quiz/api/health` | quiz_api:4000 | NestJS + DB |
