import { ListOrdersUseCase } from "../src/useCases/ListOrdersUseCase";
import { AppDataSource } from "../src/database/data-source";

jest.mock("../src/database/data-source");

describe("ListOrdersUseCase", () => {
  let mockRepo: any;
  beforeEach(() => {
    mockRepo = { find: jest.fn() };
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(mockRepo);
  });

  it("deve excluir OS finalizadas/entregues/canceladas e ordenar por status", async () => {
    mockRepo.find.mockResolvedValue([
      { id: 1, status: "RECEBIDA" },
      { id: 2, status: "EM_EXECUCAO" },
      { id: 3, status: "FINALIZADA" },
      { id: 4, status: "AGUARDANDO_APROVACAO" },
      { id: 5, status: "CANCELADA" },
    ]);
    const result = await new ListOrdersUseCase().execute();
    // Sobram 3 (exclui FINALIZADA e CANCELADA)
    expect(result.length).toBe(3);
    // EM_EXECUCAO vem primeiro
    expect(result[0].status).toBe("EM_EXECUCAO");
    expect(result[1].status).toBe("AGUARDANDO_APROVACAO");
    expect(result[2].status).toBe("RECEBIDA");
  });
});
