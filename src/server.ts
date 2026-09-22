import "reflect-metadata";
import "express-async-errors";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./database/data-source";
import { routes } from "./routes/routes";
import { connectRabbitMQ } from "./messaging/rabbitmq";
import { sagaOrchestrator } from "./saga/SagaOrchestrator";

export const app = express();
app.use(cors());
app.use(express.json());
app.use(routes);
app.get("/health", (_req, res) => res.json({ status: "ok", service: "os-service" }));

const PORT = Number(process.env.PORT || 3000);

async function bootstrap() {
  await AppDataSource.initialize();
  await connectRabbitMQ();
  await sagaOrchestrator.registerHandlers();
  app.listen(PORT, () => {
    console.log(JSON.stringify({ level: "info", message: "os-service iniciado", port: PORT }));
  });
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error(JSON.stringify({ level: "error", message: "falha ao iniciar", error: err.message }));
    process.exit(1);
  });
}
