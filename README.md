# To-Do App Challenge

## Getting Started

### 1. Start Postgres

Requires Docker running (Docker Desktop on Mac/Windows, or the Docker daemon on Linux).

```bash
docker compose up -d
```

### 2. Set up environment variables

Create `server/.env`:

```
DATABASE_URL="postgresql://dev:dev@localhost:5432/appdb"
```

Create `.env` (in root directory):

```
VITE_API_URL=http://localhost:4000
```

### 3. Backend

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Server runs on http://localhost:4000

### 4. Frontend (in a separate terminal)

```bash
cd .. # root dir
npm install
npm run dev
```

Frontend runs on http://localhost:5173
