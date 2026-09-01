import { useState } from "react";
import type { Todo } from "../api";

type RowProps = {
  todo: Todo;
  /** Parents with sub-todos have a derived (read-only) checkbox. */
  disableCheckbox?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
};

/** A single todo line: checkbox, (editable) title, delete. Shared by parents and children. */
function Row({
  todo,
  disableCheckbox,
  onToggle,
  onDelete,
  onRename,
}: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  async function commit() {
    const title = draft.trim();
    if (title && title !== todo.title) {
      await onRename(todo.id, title);
    } else {
      setDraft(todo.title);
    }
    setEditing(false);
  }

  return (
    <div className={`row${todo.completed ? " done" : ""}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        disabled={disableCheckbox}
        onChange={() => onToggle(todo.id)}
        aria-label={`Toggle ${todo.title}`}
        title={
          disableCheckbox ? "Completes when all sub-todos are done" : undefined
        }
      />

      {editing ? (
        <input
          className="edit-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className="title"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          {todo.title}
        </span>
      )}

      <button
        className="icon-btn"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${todo.title}`}
        title="Rename"
      >
        ✎
      </button>
      <button
        className="icon-btn danger"
        onClick={() => onDelete(todo.id)}
        aria-label={`Delete ${todo.title}`}
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

type TodoItemProps = {
  todo: Todo;
  childrenTodos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onAddSubtodo: (parentId: string, title: string) => Promise<void>;
};

export function TodoItem({
  todo,
  childrenTodos,
  onToggle,
  onDelete,
  onRename,
  onAddSubtodo,
}: TodoItemProps) {
  const [adding, setAdding] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const hasChildren = childrenTodos.length > 0;

  async function submitSub(e: React.FormEvent) {
    e.preventDefault();
    const title = subTitle.trim();
    if (!title) return;
    await onAddSubtodo(todo.id, title);
    setSubTitle("");
    setAdding(false);
  }

  return (
    <li className="todo">
      <div className="todo-main">
        {/* A parent's completion is derived from its children, so its checkbox is read-only. */}
        <Row
          todo={todo}
          disableCheckbox={hasChildren}
          onToggle={onToggle}
          onDelete={onDelete}
          onRename={onRename}
        />
        <button
          className="add-sub"
          onClick={() => setAdding((a) => !a)}
          title="Add a sub-todo"
        >
          + sub-todo
        </button>
      </div>

      {(hasChildren || adding) && (
        <ul className="subtodos">
          {childrenTodos.map((child) => (
            <li key={child.id}>
              <Row
                todo={child}
                onToggle={onToggle}
                onDelete={onDelete}
                onRename={onRename}
              />
            </li>
          ))}

          {adding && (
            <li>
              <form className="add-row sub" onSubmit={submitSub}>
                <input
                  className="add-input"
                  autoFocus
                  placeholder="Add a sub-todo…"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  aria-label={`New sub-todo under ${todo.title}`}
                />
                <button
                  className="btn"
                  type="submit"
                  disabled={!subTitle.trim()}
                >
                  Add
                </button>
              </form>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
