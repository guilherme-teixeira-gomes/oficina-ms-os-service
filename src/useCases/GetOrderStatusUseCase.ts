import { AppDataSource } from "../database/data-source";
import { ServiceOrder } from "../entities/ServiceOrder";

export class GetOrderStatusUseCase {
  async execute(orderId: number) {
    const repo = AppDataSource.getRepository(ServiceOrder);
    const order = await repo.findOne({ where: { id: orderId }, relations: ["diagnostics"] });
    if (!order) throw new Error("Ordem de serviço não encontrada");
    return {
      id: order.id,
      status: order.status,
      sagaId: order.sagaId,
      budgetCents: Number(order.budgetCents),
      approved: order.approved,
      client: { name: order.clientName, document: order.clientDocument },
      vehicle: { plate: order.vehiclePlate },
      createdAt: order.createdAt,
      startedAt: order.startedAt,
      finishedAt: order.finishedAt,
    };
  }
}
