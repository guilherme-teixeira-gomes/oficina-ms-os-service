import { AppDataSource } from "../database/data-source";
import { ServiceOrder } from "../entities/ServiceOrder";
import { Diagnostic } from "../entities/Diagnostic";
import { sagaOrchestrator } from "../saga/SagaOrchestrator";

interface CreateOrderInput {
  client: { document: string; name: string; email?: string; phone?: string };
  vehicle: { plate: string; brand?: string; model?: string; year?: number };
  observation?: string;
  diagnostics?: Array<{ title: string; description?: string; includeInBudget?: boolean; priority?: string }>;
}

export class CreateOrderUseCase {
  async execute(input: CreateOrderInput): Promise<ServiceOrder> {
    const repo = AppDataSource.getRepository(ServiceOrder);

    const order = repo.create({
      clientDocument: input.client.document.replace(/[^\d]/g, ""),
      clientName: input.client.name,
      clientEmail: input.client.email,
      clientPhone: input.client.phone,
      vehiclePlate: input.vehicle.plate,
      vehicleBrand: input.vehicle.brand,
      vehicleModel: input.vehicle.model,
      vehicleYear: input.vehicle.year,
      observation: input.observation,
      status: "RECEBIDA",
      diagnostics: (input.diagnostics || []).map((d) => {
        const diag = new Diagnostic();
        diag.title = d.title;
        diag.description = d.description;
        diag.includeInBudget = d.includeInBudget ?? true;
        diag.priority = d.priority || "media";
        return diag;
      }),
    });

    const saved = await repo.save(order);

    // Dispara o Saga
    await sagaOrchestrator.start(saved);

    return repo.findOneOrFail({ where: { id: saved.id }, relations: ["diagnostics"] });
  }
}
