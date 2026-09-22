import { AppDataSource } from "../database/data-source";
import { ServiceOrder } from "../entities/ServiceOrder";

const STATUS_ORDER: Record<string, number> = {
  EM_EXECUCAO: 1, AGUARDANDO_APROVACAO: 2, AGUARDANDO_ORCAMENTO: 3, RECEBIDA: 4,
};

export class ListOrdersUseCase {
  async execute() {
    const repo = AppDataSource.getRepository(ServiceOrder);
    const orders = await repo.find({ relations: ["diagnostics"] });
    // Exclui finalizadas/entregues/canceladas e ordena por prioridade de status
    return orders
      .filter((o) => !["FINALIZADA", "ENTREGUE", "CANCELADA"].includes(o.status))
      .sort((a, b) => (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99));
  }
}
