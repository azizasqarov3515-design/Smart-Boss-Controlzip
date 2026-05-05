# SMARTBOSScontrol Workspace

Aksessuarlar do'koni uchun ichki boshqaruv tizimi (Expo mobil app + Express API) va alohida Admin nazoratchi web paneli.

## Run & Operate

- `pnpm run typecheck` — barcha paketlarni typecheck qilish
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI spec dan hooklar va Zod schemalar generatsiya
- `pnpm --filter @workspace/db run push` — DB schema o'zgarishlarini push qilish (dev only)
- `pnpm --filter @workspace/api-server run dev` — API serverni lokal ishga tushirish

Muhim env vars: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **API**: Express 5 (`artifacts/api-server`)
- **DB**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod v4, drizzle-zod
- **Mobil app**: Expo ~54 (`artifacts/smartboss`)
- **Admin panel**: React + Vite + Tailwind (`artifacts/admin-panel`)
- **Build**: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (managers, workers, products, sales, customers, audit_logs)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `artifacts/api-server/src/routes/` — API routes (auth, admin, products, sales, customers, workers, delete_requests)
- `artifacts/smartboss/contexts/AuthContext.tsx` — Auth + subscription state
- `artifacts/smartboss/components/SubscriptionGuard.tsx` — Subscription block/warning UI
- `artifacts/admin-panel/src/App.tsx` — Admin web panel (login + dashboard + obuna boshqaruvi)

## Architecture decisions

- **Multi-tenant**: Har bir manager o'z `managerId` bo'yicha izolyatsiya qilingan; DB querylar har doim `where managerId = ?` sharti bilan
- **Token**: HMAC-SHA256 signed JWT (SESSION_SECRET), admin uchun alohida `:admin` suffix bilan
- **Parol shifrlash**: Manager paroli `encryptedPassword` (AES-256-CBC) da saqlanadi — admin panel ko'rish uchun; `passwordHash` (scrypt) autentifikatsiya uchun
- **Subscription check**: `routes/index.ts` middleware da — muddati o'tgan bo'lsa 402 qaytaradi; Expo da `SubscriptionGuard` komponent blok/ogohlantirish ko'rsatadi
- **Admin auth**: Alohida `ADMIN_PASSWORD` env var + 12 soatlik admin JWT token; hech qanday DB yozuvi yo'q

## Product

- Manager: do'kon, mahsulot, sotuv, mijoz, ishchi boshqaruvi
- Ishchi (worker): POS kassa, delete request yuborish
- Obuna tizimi: 1m/3m/6m/1y — tugashidan 3 kun oldin ogohlantirish, muddati o'tsa to'liq bloklash
- Admin nazoratchi: barcha do'konlarni ko'rish, obuna belgilash, vaqtinchalik kirish ma'lumotlari o'rnatish, faoliyat tarixi

## User preferences

- Barcha UI matnlar O'zbek tilida
- Login: 8 ta katta harf+raqam; Parol: 6 ta raqam
- Do'kon ID: 2 katta harf + 8 raqam (masalan: AB12345678)
- Telegram/email integratsiyalari olib tashlangan

## Gotchas

- `pnpm --filter @workspace/db run push` — interaktiv bo'lishi mumkin; rename bo'lmaydi deb sxemada `telegramChatId` qoldirildi
- Admin token va manager token bir xil SESSION_SECRET dan, lekin HMAC `:admin` suffix bilan farqlanadi
- Worker login qilganda manager subscriptioni ham tekshiriladi

## Pointers

- Obuna boshqaruvi: `artifacts/api-server/src/routes/admin.ts`
- Subscription guard (mobil): `artifacts/smartboss/components/SubscriptionGuard.tsx`
- Audit log: `lib/db/src/schema/audit_logs.ts`
