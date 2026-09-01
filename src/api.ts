export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  parentId: string | null;
};

export type ToggleResult = {
  todo: Todo;
  parent: Todo | null;
};

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  // 204 No Content has no body to parse.
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  list: () => fetch(`${BASE}/todos`).then((r) => handle<Todo[]>(r)),

  create: (title: string, parentId: string | null = null) =>
    fetch(`${BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, parentId }),
    }).then((r) => handle<Todo>(r)),

  toggle: (id: string) =>
    fetch(`${BASE}/todos/${id}/toggle`, { method: "PATCH" }).then((r) =>
      handle<ToggleResult>(r),
    ),

  rename: (id: string, title: string) =>
    fetch(`${BASE}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then((r) => handle<Todo>(r)),

  remove: (id: string) =>
    fetch(`${BASE}/todos/${id}`, { method: "DELETE" }).then((r) =>
      handle<{ parent: Todo | null }>(r),
    ),
};
