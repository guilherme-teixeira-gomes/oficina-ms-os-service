import { Request, Response } from "express";
import { CreateOrderUseCase } from "../useCases/CreateOrderUseCase";
import { GetOrderStatusUseCase } from "../useCases/GetOrderStatusUseCase";
import { ListOrdersUseCase } from "../useCases/ListOrdersUseCase";
import { sagaOrchestrator } from "../saga/SagaOrchestrator";

export class OrderController {
  async create(req: Request, res: Response) {
    const useCase = new CreateOrderUseCase();
    const order = await useCase.execute(req.body);
    return res.status(201).json({ success: true, message: "OS criada. Saga iniciado.", data: order });
  }

  async status(req: Request, res: Response) {
    const useCase = new GetOrderStatusUseCase();
    const data = await useCase.execute(Number(req.params.id));
    return res.json({ success: true, data });
  }

  async list(_req: Request, res: Response) {
    const useCase = new ListOrdersUseCase();
    const data = await useCase.execute();
    return res.json({ success: true, data });
  }

  async approve(req: Request, res: Response) {
    const order = await sagaOrchestrator.approve(Number(req.params.id));
    return res.json({ success: true, message: "Orçamento aprovado. Pagamento solicitado.", data: order });
  }
}
