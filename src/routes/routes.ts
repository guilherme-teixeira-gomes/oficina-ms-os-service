import { Router } from "express";
import { OrderController } from "../controllers/OrderController";

const routes = Router();
const controller = new OrderController();

routes.post("/service-order", (req, res) => controller.create(req, res));
routes.get("/service-order", (req, res) => controller.list(req, res));
routes.get("/service-order/:id/status", (req, res) => controller.status(req, res));
routes.post("/service-order/:id/approve", (req, res) => controller.approve(req, res));

export { routes };
