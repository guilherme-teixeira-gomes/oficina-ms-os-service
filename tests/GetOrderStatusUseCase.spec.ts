import { GetOrderStatusUseCase } from "../src/useCases/GetOrderStatusUseCase";
import { AppDataSource } from "../src/database/data-source";

jest.mock("../src/database/data-source");

describe("GetOrderStatusUseCase", () => {
  let mockRepo: any;
  beforeEach(() => {
    mockRepo = { findOne: jest.fn() };
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(mockRepo);
  });

  it("deve retornar o status da OS", async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1, status: "EM_EXECUCAO", sagaId: "abc", budgetCents: 5000, approved: true,
      clientName: "João", clientDocument: "52998224725", vehiclePlate: "ABC1234",
      createdAt: new Date(), startedAt: null, finishedAt: null,
    });
    const result = await new GetOrderStatusUseCase().execute(1);
    expect(result.status).toBe("EM_EXECUCAO");
    expect(result.budgetCents).toBe(5000);
  });

  it("deve lançar erro se OS não existe", async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(new GetOrderStatusUseCase().execute(999)).rejects.toThrow("não encontrada");
  });
});
