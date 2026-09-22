import "reflect-metadata";
import { DataSource } from "typeorm";
import { ServiceOrder } from "../entities/ServiceOrder";
import { Diagnostic } from "../entities/Diagnostic";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "postgres",
  database: process.env.DB_NAME || "os_service",
  entities: [ServiceOrder, Diagnostic],
  synchronize: true,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
