import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import todosRouter from "./routes/todos";

const app = express();

app.use(cors());
app.use(express.json());
app.use(healthRouter);
app.use(todosRouter);

export default app;
