import { useEffect, useMemo, useState } from "react";
import { api, type Todo } from "./api";
import { TodoItem } from "./components/TodoItem";
import "./App.css";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    api
      .list()
      .then(setTodos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Group sub-todos by their parent id for quick lookup.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (t.parentId) {
        const list = map.get(t.parentId) ?? [];
        list.push(t);
        map.set(t.parentId, list);
      }
    }
    return map;
  }, [todos]);

  const parents = useMemo(
    () => todos.filter((t) => t.parentId === null),
    [todos],
  );

  // Merge one or more updated todos into local state by id.
  function upsert(...updated: (Todo | null)[]) {
    setTodos((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const u of updated) if (u) byId.set(u.id, u);
      return [...byId.values()];
    });
  }

  async function addParent() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const todo = await api.create(title, null);
      setNewTitle("");
      upsert(todo);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addSubtodo(parentId: string, title: string) {
    const created = await api.create(title, parentId);
    // The parent may have flipped to incomplete now that it has a new child.
    const parent = todos.find((t) => t.id === parentId);
    upsert(created, parent ? { ...parent, completed: false } : null);
  }

  async function toggle(id: string) {
    try {
      const { todo, parent } = await api.toggle(id);
      // Update the toggled todo and, when present, its parent without refetch.
      upsert(todo, parent);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function rename(id: string, title: string) {
    const updated = await api.rename(id, title);
    upsert(updated);
  }

  async function remove(id: string) {
    try {
      const { parent } = await api.remove(id);
      setTodos((prev) => {
        // Drop the todo and any of its sub-todos from the UI.
        const next = prev.filter((t) => t.id !== id && t.parentId !== id);
        // Removing a sub-todo may have flipped the parent's completed state.
        return parent
          ? next.map((t) => (t.id === parent.id ? parent : t))
          : next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Compute the number of remaining todos.
  const remaining = useMemo(
    () => todos.filter((t) => !t.completed).length,
    [todos],
  );

  return (
    <main className="app">
      <h1>To-Do List</h1>
      <p className="subtitle">
        {loading
          ? "Loading…"
          : remaining === 0
            ? "All done!"
            : `${remaining} of ${todos.length} remaining`}
      </p>

      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          addParent();
        }}
      >
        <input
          className="add-input"
          placeholder="Add a to-do…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          aria-label="New to-do title"
        />
        <button
          className="btn primary"
          type="submit"
          disabled={!newTitle.trim()}
        >
          Add
        </button>
      </form>

      {error && (
        <p className="error" role="alert" onClick={() => setError(null)}>
          {error} <span className="dismiss">(dismiss)</span>
        </p>
      )}

      {!loading && parents.length === 0 && (
        <p className="empty">No to-dos yet. Add one above.</p>
      )}

      <ul className="todo-list">
        {parents.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            childrenTodos={childrenByParent.get(todo.id) ?? []}
            onToggle={toggle}
            onDelete={remove}
            onRename={rename}
            onAddSubtodo={addSubtodo}
          />
        ))}
      </ul>
    </main>
  );
}

export default App;
