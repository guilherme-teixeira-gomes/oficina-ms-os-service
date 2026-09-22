import { CreateOrderUseCase } from "../src/useCases/CreateOrderUseCase";
import { AppDataSource } from "../src/database/data-source";
import { sagaOrchestrator } from "../src/saga/SagaOrchestrator";

jest.mock("../src/database/data-source");
jest.mock("../src/saga/SagaOrchestrator", () => ({
  sagaOrchestrator: { start: jest.fn().mockResolvedValue(undefined) },
}));

describe("CreateOrderUseCase", () => {
  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const saved = { id: 1, status: "RECEBIDA", diagnostics: [] };
    mockRepo = {
      create: jest.fn().mockImplementation((o) => o),
      save: jest.fn().mockResolvedValue(saved),
      findOneOrFail: jest.fn().mockResolvedValue(saved),
    };
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(mockRepo);
  });

  it("deve criar OS com status RECEBIDA", async () => {
    const useCase = new CreateOrderUseCase();
    const result = await useCase.execute({
      client: { document: "529.982.247-25", name: "João" },
      vehicle: { plate: "ABC1234" },
    });
    expect(result.status).toBe("RECEBIDA");
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it("deve iniciar o Saga após criar a OS", async () => {
    const useCase = new CreateOrderUseCase();
    await useCase.execute({
      client: { document: "52998224725", name: "João" },
      vehicle: { plate: "ABC1234" },
    });
    expect(sagaOrchestrator.start).toHaveBeenCalledTimes(1);
  });

  it("deve limpar a máscara do CPF", async () => {
    const useCase = new CreateOrderUseCase();
    await useCase.execute({
      client: { document: "529.982.247-25", name: "João" },
      vehicle: { plate: "ABC1234" },
    });
    const arg = mockRepo.create.mock.calls[0][0];
    expect(arg.clientDocument).toBe("52998224725");
  });
});
