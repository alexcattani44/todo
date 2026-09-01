import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

// Track ids created during a test so we can clean up without touching seed data.
const created: string[] = [];

async function createTodo(title: string, parentId: string | null = null) {
  const res = await request(app).post("/todos").send({ title, parentId });
  if (res.status === 201) created.push(res.body.id);
  return res;
}

afterEach(async () => {
  if (created.length) {
    // Deleting parents cascades to children; ignore already-gone rows.
    await prisma.todo.deleteMany({ where: { id: { in: created } } });
    created.length = 0;
  }
});

describe("PATCH /todos/:id/toggle — parent cascade", () => {
  it("marks the parent completed after completing the last remaining sub-todo", async () => {
    const parent = (await createTodo("Parent A")).body;
    const child1 = (await createTodo("Child A1", parent.id)).body;
    const child2 = (await createTodo("Child A2", parent.id)).body;

    // Complete the first child — parent still has an incomplete child.
    let res = await request(app).patch(`/todos/${child1.id}/toggle`);
    expect(res.status).toBe(200);
    expect(res.body.parent.completed).toBe(false);

    // Complete the last remaining child — parent should flip to complete.
    res = await request(app).patch(`/todos/${child2.id}/toggle`);
    expect(res.status).toBe(200);
    expect(res.body.todo.completed).toBe(true);
    expect(res.body.parent.id).toBe(parent.id);
    expect(res.body.parent.completed).toBe(true);
  });

  it("marks the parent incomplete after unchecking a sub-todo on an otherwise-completed parent", async () => {
    const parent = (await createTodo("Parent B")).body;
    const child1 = (await createTodo("Child B1", parent.id)).body;
    const child2 = (await createTodo("Child B2", parent.id)).body;

    // Complete both children so the parent becomes complete.
    await request(app).patch(`/todos/${child1.id}/toggle`);
    let res = await request(app).patch(`/todos/${child2.id}/toggle`);
    expect(res.body.parent.completed).toBe(true);

    // Uncheck one child — parent should return to incomplete.
    res = await request(app).patch(`/todos/${child1.id}/toggle`);
    expect(res.status).toBe(200);
    expect(res.body.todo.completed).toBe(false);
    expect(res.body.parent.completed).toBe(false);
  });
});

describe("POST /todos — nesting rules", () => {
  it("returns an error when creating a sub-todo under a todo that is itself a sub-todo", async () => {
    const parent = (await createTodo("Parent C")).body;
    const child = (await createTodo("Child C1", parent.id)).body;

    const res = await createTodo("Grandchild C", child.id);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sub-todo/i);
  });

  it("returns an error when creating a sub-todo under a non-existent parent", async () => {
    const res = await createTodo("Orphan", "does-not-exist");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/i);
  });
});

describe("DELETE /todos/:id", () => {
  it("cascades a deleted parent todo to its children", async () => {
    const parent = (await createTodo("Parent D")).body;
    const child = (await createTodo("Child D1", parent.id)).body;

    const res = await request(app).delete(`/todos/${parent.id}`);
    expect(res.status).toBe(204);

    expect(
      await prisma.todo.findUnique({ where: { id: parent.id } }),
    ).toBeNull();
    expect(
      await prisma.todo.findUnique({ where: { id: child.id } }),
    ).toBeNull();
  });

  it("returns a 404 if the todo does not exist", async () => {
    const res = await request(app).delete("/todos/does-not-exist");
    expect(res.status).toBe(404);
  });
});
