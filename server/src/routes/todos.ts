import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * Recompute a parent's completed state from its children and persist it.
 * A parent is completed when it has children and all of them are completed.
 * Returns the refreshed parent, or null if there is no parent.
 */
async function recalcParent(parentId: string | null) {
  if (!parentId) return null;

  const children = await prisma.todo.findMany({ where: { parentId } });
  const allComplete = children.length > 0 && children.every((c) => c.completed);

  return prisma.todo.update({
    where: { id: parentId },
    data: { completed: allComplete },
  });
}

// List all todos (flat array; parentId describes the nesting).
router.get("/todos", async (_req, res) => {
  const todos = await prisma.todo.findMany({ orderBy: { title: "asc" } });
  res.json(todos);
});

// Create a top-level todo (parentId null) or a sub-todo (parentId set).
router.post("/todos", async (req, res) => {
  const { title, parentId = null } = req.body ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required" });
  }

  if (parentId !== null) {
    const parent = await prisma.todo.findUnique({ where: { id: parentId } });
    if (!parent) {
      return res.status(400).json({ error: "parent todo does not exist" });
    }
    if (parent.parentId !== null) {
      return res
        .status(400)
        .json({ error: "cannot nest a sub-todo under another sub-todo" });
    }
  }

  const todo = await prisma.todo.create({
    data: { title: title.trim(), parentId },
  });

  // A new (incomplete) sub-todo can make a previously-complete parent incomplete.
  await recalcParent(parentId);

  res.status(201).json(todo);
});

// Toggle a todo's completed state, cascading to the parent when needed.
router.patch("/todos/:id/toggle", async (req, res) => {
  const existing = await prisma.todo.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "todo not found" });
  }

  const todo = await prisma.todo.update({
    where: { id: existing.id },
    data: { completed: !existing.completed },
  });

  const parent = await recalcParent(todo.parentId);
  res.json({ todo, parent });
});

// Rename a todo (inline editing).
router.patch("/todos/:id", async (req, res) => {
  const { title } = req.body ?? {};
  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required" });
  }

  const existing = await prisma.todo.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "todo not found" });
  }

  const todo = await prisma.todo.update({
    where: { id: existing.id },
    data: { title: title.trim() },
  });
  res.json(todo);
});

// Delete a todo (its sub-todos cascade via the DB relation).
router.delete("/todos/:id", async (req, res) => {
  const existing = await prisma.todo.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "todo not found" });
  }

  await prisma.todo.delete({ where: { id: existing.id } });

  // Recompute AFTER the delete: dropping an incomplete sub-todo can leave the
  // parent with only completed children, which flips the parent to complete.
  const parent = await recalcParent(existing.parentId);

  res.json({ parent });
});

export default router;
