import { SagaOrchestrator } from "../src/saga/SagaOrchestrator";
import { AppDataSource } from "../src/database/data-source";
import * as rabbit from "../src/messaging/rabbitmq";

jest.mock("../src/database/data-source");
jest.mock("../src/messaging/rabbitmq");

describe("SagaOrchestrator - handlers de eventos", () => {
  let db: Record<number, any>;
  let handlers: Record<string, (msg: any) => Promise<void>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = {};
    handlers = {};
    const repo = {
      save: jest.fn().mockImplementation((o) => { db[o.id] = { ...db[o.id], ...o }; return Promise.resolve(o); }),
      findOneBy: jest.fn().mockImplementation(({ id }) => Promise.resolve(db[id])),
    };
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(repo);
    (rabbit.publishEvent as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    // captura os handlers registrados no subscribe
    (rabbit.subscribe as jest.Mock) = jest.fn().mockImplementation((_q, key, handler) => {
      handlers[key] = handler;
      return Promise.resolve();
    });
    await new SagaOrchestrator().registerHandlers();
  });

  it("os.orcamento-gerado deve atualizar budget e status para AGUARDANDO_APROVACAO", async () => {
    db[1] = { id: 1, status: "AGUARDANDO_ORCAMENTO" };
    await handlers["os.orcamento-gerado"]({ orderId: 1, amountCents: 25000 });
    expect(db[1].status).toBe("AGUARDANDO_APROVACAO");
    expect(db[1].budgetCents).toBe(25000);
  });

  it("os.orcamento-falhou deve cancelar a OS (compensação)", async () => {
    db[1] = { id: 1, status: "AGUARDANDO_ORCAMENTO" };
    await handlers["os.orcamento-falhou"]({ orderId: 1, reason: "sem estoque" });
    expect(db[1].status).toBe("CANCELADA");
  });

  it("os.pagamento-aprovado deve disparar comando de execução", async () => {
    db[1] = { id: 1, status: "AGUARDANDO_APROVACAO", sagaId: "s1" };
    await handlers["os.pagamento-aprovado"]({ orderId: 1 });
    expect(rabbit.publishEvent).toHaveBeenCalledWith("execution.iniciar", expect.objectContaining({ orderId: 1 }));
  });

  it("os.pagamento-recusado deve reverter para AGUARDANDO_APROVACAO (compensação)", async () => {
    db[1] = { id: 1, status: "AGUARDANDO_APROVACAO", approved: true };
    await handlers["os.pagamento-recusado"]({ orderId: 1, reason: "cartão negado" });
    expect(db[1].status).toBe("AGUARDANDO_APROVACAO");
    expect(db[1].approved).toBe(false);
  });

  it("os.execucao-iniciada deve mudar status para EM_EXECUCAO", async () => {
    db[1] = { id: 1, status: "AGUARDANDO_APROVACAO" };
    await handlers["os.execucao-iniciada"]({ orderId: 1 });
    expect(db[1].status).toBe("EM_EXECUCAO");
  });

  it("os.execucao-finalizada deve mudar status para FINALIZADA", async () => {
    db[1] = { id: 1, status: "EM_EXECUCAO" };
    await handlers["os.execucao-finalizada"]({ orderId: 1 });
    expect(db[1].status).toBe("FINALIZADA");
  });

  it("os.execucao-falhou deve estornar pagamento e cancelar (compensação)", async () => {
    db[1] = { id: 1, status: "EM_EXECUCAO", sagaId: "s1" };
    await handlers["os.execucao-falhou"]({ orderId: 1, reason: "peça quebrou" });
    expect(rabbit.publishEvent).toHaveBeenCalledWith("billing.estornar-pagamento", expect.objectContaining({ orderId: 1 }));
    expect(db[1].status).toBe("CANCELADA");
  });
});

describe("SagaOrchestrator - branches de guarda (order inexistente)", () => {
  let handlers: Record<string, (msg: any) => Promise<void>>;
  beforeEach(async () => {
    jest.clearAllMocks();
    handlers = {};
    const repo = {
      save: jest.fn().mockResolvedValue(undefined),
      findOneBy: jest.fn().mockResolvedValue(null), // sempre não encontra
    };
    const { AppDataSource } = require("../src/database/data-source");
    const rabbit = require("../src/messaging/rabbitmq");
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(repo);
    (rabbit.publishEvent as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (rabbit.subscribe as jest.Mock) = jest.fn().mockImplementation((_q: string, key: string, h: any) => {
      handlers[key] = h; return Promise.resolve();
    });
    const { SagaOrchestrator } = require("../src/saga/SagaOrchestrator");
    await new SagaOrchestrator().registerHandlers();
  });

  const keys = [
    "os.orcamento-gerado", "os.orcamento-falhou", "os.pagamento-aprovado",
    "os.pagamento-recusado", "os.execucao-iniciada", "os.execucao-finalizada", "os.execucao-falhou",
  ];

  it.each(keys)("%s não deve quebrar quando a OS não existe", async (key) => {
    await expect(handlers[key]({ orderId: 999 })).resolves.toBeUndefined();
  });
});
