import swaggerUi from "swagger-ui-express";
import { Express } from "express";

/**
 * Documentação OpenAPI do OS Service.
 * Acessível em /api-docs quando o serviço está rodando.
 */
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "OS Service — Oficina",
    version: "1.0.0",
    description:
      "Microsserviço de Ordens de Serviço e orquestrador do Saga (Tech Challenge Fase 4). " +
      "Gerencia o ciclo de vida da OS e coordena o fluxo distribuído entre Billing e Execution.",
  },
  tags: [{ name: "Ordens de Serviço" }],
  paths: {
    "/service-order": {
      post: {
        tags: ["Ordens de Serviço"],
        summary: "Abre uma OS e inicia o Saga",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOrder" },
              example: {
                client: { document: "529.982.247-25", name: "João Cliente", email: "joao@email.com" },
                vehicle: { plate: "ABC1234", brand: "Fiat", model: "Uno", year: 2020 },
                observation: "Revisão geral",
                diagnostics: [
                  { title: "Troca de óleo", includeInBudget: true },
                  { title: "Alinhamento", includeInBudget: true },
                ],
              },
            },
          },
        },
        responses: { "201": { description: "OS criada, Saga iniciado" } },
      },
      get: {
        tags: ["Ordens de Serviço"],
        summary: "Lista OS ativas (exclui finalizadas/entregues/canceladas)",
        responses: { "200": { description: "Lista de OS ordenada por status" } },
      },
    },
    "/service-order/{id}/status": {
      get: {
        tags: ["Ordens de Serviço"],
        summary: "Consulta status e histórico de uma OS",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Status atual da OS" }, "404": { description: "OS não encontrada" } },
      },
    },
    "/service-order/{id}/approve": {
      post: {
        tags: ["Ordens de Serviço"],
        summary: "Cliente aprova o orçamento (dispara pagamento)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Orçamento aprovado, pagamento solicitado" } },
      },
    },
    "/health": {
      get: { tags: ["Ordens de Serviço"], summary: "Healthcheck", responses: { "200": { description: "ok" } } },
    },
  },
  components: {
    schemas: {
      CreateOrder: {
        type: "object",
        properties: {
          client: {
            type: "object",
            properties: {
              document: { type: "string", description: "CPF/CNPJ" },
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
            },
            required: ["document", "name"],
          },
          vehicle: {
            type: "object",
            properties: {
              plate: { type: "string" },
              brand: { type: "string" },
              model: { type: "string" },
              year: { type: "integer" },
            },
            required: ["plate"],
          },
          observation: { type: "string" },
          diagnostics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                includeInBudget: { type: "boolean" },
                priority: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
