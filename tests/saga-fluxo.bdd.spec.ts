/**
 * Teste BDD (Behavior-Driven Development) do fluxo completo do Saga.
 * Escrito no estilo Given/When/Then exigido pelo Tech Challenge Fase 4.
 *
 * Cenário: Ciclo de vida de uma Ordem de Serviço através do Saga orquestrado.
 */
import { SagaOrchestrator } from "../src/saga/SagaOrchestrator";
import { AppDataSource } from "../src/database/data-source";
import * as rabbit from "../src/messaging/rabbitmq";

jest.mock("../src/database/data-source");
jest.mock("../src/messaging/rabbitmq");

describe("FEATURE: Fluxo transacional de Ordem de Serviço (Saga Orquestrado)", () => {
  let saga: SagaOrchestrator;
  let db: Record<number, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {};
    const repo = {
      save: jest.fn().mockImplementation((o) => { db[o.id] = { ...o }; return Promise.resolve(o); }),
      findOneByOrFail: jest.fn().mockImplementation(({ id }) => Promise.resolve(db[id])),
      findOneBy: jest.fn().mockImplementation(({ id }) => Promise.resolve(db[id])),
    };
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(repo);
    (rabbit.publishEvent as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    saga = new SagaOrchestrator();
  });

  describe("CENÁRIO: Orçamento aprovado e pago com sucesso", () => {
    it("DADO uma OS recebida, QUANDO o Saga inicia, ENTÃO solicita orçamento ao Billing", async () => {
      // GIVEN
      const order: any = { id: 10, diagnostics: [], status: "RECEBIDA" };
      db[10] = order;
      // WHEN
      await saga.start(order);
      // THEN
      expect(order.status).toBe("AGUARDANDO_ORCAMENTO");
      expect(rabbit.publishEvent).toHaveBeenCalledWith("billing.gerar-orcamento", expect.objectContaining({ orderId: 10 }));
    });

    it("DADO uma OS aguardando aprovação, QUANDO o cliente aprova, ENTÃO solicita pagamento", async () => {
      // GIVEN
      db[10] = { id: 10, status: "AGUARDANDO_APROVACAO", budgetCents: 15000, sagaId: "saga-10" };
      // WHEN
      await saga.approve(10);
      // THEN
      expect(rabbit.publishEvent).toHaveBeenCalledWith(
        "billing.processar-pagamento",
        expect.objectContaining({ orderId: 10, amountCents: 15000 })
      );
      expect(db[10].approved).toBe(true);
    });
  });

  describe("CENÁRIO: Compensação quando o pagamento é recusado", () => {
    it("DADO uma OS que não está aguardando aprovação, QUANDO tenta aprovar, ENTÃO rejeita", async () => {
      // GIVEN
      db[20] = { id: 20, status: "EM_EXECUCAO" };
      // WHEN / THEN
      await expect(saga.approve(20)).rejects.toThrow("não está aguardando aprovação");
    });
  });
});
