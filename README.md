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
DATABASE_URL="postgresql://dev:dev@localhost:5432/tododb"
```

Create `.env` (in root directory):

```
VITE_API_URL=http://localhost:4000
```

### 3. Backend

Quick command:

```bash
cd server
npm install
npm run serve
```

Granular:

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run seed   # populate a starter set of todos
npm run dev
```

Server runs on http://localhost:4000

Run backend tests with:

```bash
cd server
npm test
```

### 4. Frontend (in a separate terminal)

```bash
cd .. # root dir
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## API

| Method | Path                | Purpose                                               |
| ------ | ------------------- | ----------------------------------------------------- |
| GET    | `/todos`            | List all todos (flat array; `parentId` gives nesting) |
| POST   | `/todos`            | Create a top-level todo or sub-todo                   |
| PATCH  | `/todos/:id/toggle` | Flip `completed`, cascading to the parent             |
| PATCH  | `/todos/:id`        | Rename a todo (inline editing)                        |
| DELETE | `/todos/:id`        | Delete a todo (sub-todos cascade)                     |

### Note: returning the updated parent from toggle

`PATCH /todos/:id/toggle` responds with `{ todo, parent }`, where `parent`
is `null` for a top-level (or parent) todo. When a sub-todo is toggled, the server
recomputes the parent's `completed` state (`true` only when every child is
complete), persists it, and returns the refreshed parent alongside the
toggled todo.

I did this so the client can apply both changes from a single response rather than
firing a second request or re-fetching the whole list just to learn the parent's
new state. This single action merges `todo` and `parent` into local state by `id`.
The parent's checkbox updates in place. Parents that have sub-todos render
a read-only checkbox, since their completion is derived from their children
rather than toggled directly.

A similar issue occurs with `DELETE /todos/:id`. If a sub-todo is deleted,
and the resulting list of sub-todos are all complete, then the parent todo
should be toggled to completed. Since delete should not return the `todo` itself,
it only returns `parent` so `recalcParent` fires.

## Questions/Assumptions

**Q**: Where does the functionality for toggling a parent live?

**Assumption**: It should live in the child todo because that has access to the parent through `parentId`.

**Q**: Should toggling the parent toggle the children?

**Assumption**: Being able to mass complete a parent and all of its children sounds nice. But what would happen when the parent is untoggled? You would have to maintain the previous state of all of its children.

**Q**: Should you be able to toggle parents at all?

**Assumption**: No, a parent is only complete if the children are all complete. Use a read-only checkbox for user readability.

**Q**: Should the grouping by parents be done on the backend or frontend?

**Assumption**: The frontend; the backend can return a flat array for quicker server-side responses. The frontend will map by parent ids to create the indented list view. This tradeoff can be explored further depending on server load or browser performance.
