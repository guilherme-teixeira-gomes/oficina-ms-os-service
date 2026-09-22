import request from "supertest";
import express from "express";
import "express-async-errors";

// Mocka os use-cases e o saga para testar só a camada HTTP
jest.mock("../src/useCases/CreateOrderUseCase", () => ({
  CreateOrderUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ id: 1, status: "RECEBIDA" }),
  })),
}));
jest.mock("../src/useCases/GetOrderStatusUseCase", () => ({
  GetOrderStatusUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ id: 1, status: "EM_EXECUCAO" }),
  })),
}));
jest.mock("../src/useCases/ListOrdersUseCase", () => ({
  ListOrdersUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue([{ id: 1, status: "RECEBIDA" }]),
  })),
}));
jest.mock("../src/saga/SagaOrchestrator", () => ({
  sagaOrchestrator: { approve: jest.fn().mockResolvedValue({ id: 1, approved: true }) },
}));

import { routes } from "../src/routes/routes";

const app = express();
app.use(express.json());
app.use(routes);

describe("Rotas HTTP do OS Service", () => {
  it("POST /service-order deve criar OS (201)", async () => {
    const res = await request(app).post("/service-order").send({
      client: { document: "52998224725", name: "João" },
      vehicle: { plate: "ABC1234" },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("GET /service-order deve listar (200)", async () => {
    const res = await request(app).get("/service-order");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /service-order/:id/status deve retornar status (200)", async () => {
    const res = await request(app).get("/service-order/1/status");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("EM_EXECUCAO");
  });

  it("POST /service-order/:id/approve deve aprovar (200)", async () => {
    const res = await request(app).post("/service-order/1/approve");
    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(true);
  });
});
