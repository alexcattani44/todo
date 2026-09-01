import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./lib/prisma";

/**
 * Seed a starter set of todos so the app isn't empty on first open.
 * Sub-todo `completed` flags are chosen so parents stay consistent with
 * the "all children complete => parent complete" rule.
 */
type Seed = {
  title: string;
  completed?: boolean;
  children?: { title: string; completed?: boolean }[];
};

const data: Seed[] = [
  {
    title: "Plan the week",
    children: [
      { title: "Review calendar", completed: true },
      { title: "Set top 3 priorities" },
      { title: "Block focus time" },
    ],
  },
  {
    title: "Grocery run",
    children: [
      { title: "Milk", completed: true },
      { title: "Eggs", completed: true },
      { title: "Coffee", completed: true },
    ],
  },
  {
    title: "Ship todo app",
    children: [
      { title: "Wire up GET /todos", completed: true },
      { title: "Toggle cascades to parent" },
      { title: "Write frontend" },
    ],
  },
  { title: "Call the dentist" },
  { title: "Water the plants", completed: true },
];

async function main() {
  // Start from a clean slate (children cascade on delete).
  await prisma.todo.deleteMany({});

  for (const item of data) {
    const parent = await prisma.todo.create({
      data: { title: item.title, completed: item.completed ?? false },
    });

    if (item.children?.length) {
      await prisma.todo.createMany({
        data: item.children.map((c) => ({
          title: c.title,
          completed: c.completed ?? false,
          parentId: parent.id,
        })),
      });

      // Keep the parent's state consistent with its children.
      const children = await prisma.todo.findMany({
        where: { parentId: parent.id },
      });
      const allComplete = children.every((c) => c.completed);
      if (allComplete !== parent.completed) {
        await prisma.todo.update({
          where: { id: parent.id },
          data: { completed: allComplete },
        });
      }
    }
  }

  const count = await prisma.todo.count();
  console.log(`Seeded ${count} todos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
