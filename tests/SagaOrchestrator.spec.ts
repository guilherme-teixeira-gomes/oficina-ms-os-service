import { SagaOrchestrator } from "../src/saga/SagaOrchestrator";
import { AppDataSource } from "../src/database/data-source";
import * as rabbit from "../src/messaging/rabbitmq";

jest.mock("../src/database/data-source");
jest.mock("../src/messaging/rabbitmq");

describe("SagaOrchestrator", () => {
  let mockRepo: any;
  let saga: SagaOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
      findOneByOrFail: jest.fn(),
      findOneBy: jest.fn(),
    };
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(mockRepo);
    (rabbit.publishEvent as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    saga = new SagaOrchestrator();
  });

  it("start deve mudar status para AGUARDANDO_ORCAMENTO e publicar comando", async () => {
    const order: any = { id: 1, diagnostics: [] };
    await saga.start(order);
    expect(order.status).toBe("AGUARDANDO_ORCAMENTO");
    expect(order.sagaId).toBeDefined();
    expect(rabbit.publishEvent).toHaveBeenCalledWith("billing.gerar-orcamento", expect.objectContaining({ orderId: 1 }));
  });

  it("approve deve solicitar pagamento quando OS está aguardando aprovação", async () => {
    mockRepo.findOneByOrFail.mockResolvedValue({ id: 1, status: "AGUARDANDO_APROVACAO", budgetCents: 5000, sagaId: "abc" });
    await saga.approve(1);
    expect(rabbit.publishEvent).toHaveBeenCalledWith("billing.processar-pagamento", expect.objectContaining({ orderId: 1, amountCents: 5000 }));
  });

  it("approve deve falhar se OS não está aguardando aprovação", async () => {
    mockRepo.findOneByOrFail.mockResolvedValue({ id: 1, status: "RECEBIDA" });
    await expect(saga.approve(1)).rejects.toThrow("não está aguardando aprovação");
  });
});
