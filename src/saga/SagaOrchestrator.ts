import { randomUUID } from "crypto";
import { AppDataSource } from "../database/data-source";
import { ServiceOrder } from "../entities/ServiceOrder";
import { publishEvent, subscribe } from "../messaging/rabbitmq";

/**
 * ORQUESTRADOR DO SAGA (padrão escolhido: Saga Orquestrado).
 *
 * O OS Service é o maestro central. Ele comanda o fluxo transacional
 * distribuído e reage às respostas de cada serviço, avançando o estado
 * da OS ou disparando compensação (rollback) em caso de falha.
 *
 * FLUXO FELIZ:
 *   1. OS criada (RECEBIDA)
 *   2. -> comando billing.gerar-orcamento  => AGUARDANDO_ORCAMENTO
 *   3. <- evento os.orcamento-gerado        => AGUARDANDO_APROVACAO
 *   4. cliente aprova -> comando billing.processar-pagamento
 *   5. <- evento os.pagamento-aprovado      => comando execution.iniciar
 *   6. <- evento os.execucao-iniciada       => EM_EXECUCAO
 *   7. <- evento os.execucao-finalizada     => FINALIZADA
 *
 * COMPENSAÇÃO (rollback):
 *   - billing.orcamento-falhou    => OS volta a RECEBIDA (ou CANCELADA)
 *   - billing.pagamento-recusado  => OS volta a AGUARDANDO_APROVACAO
 *   - execution.falhou            => dispara billing.estornar-pagamento e CANCELA a OS
 */
export class SagaOrchestrator {
  private repo = () => AppDataSource.getRepository(ServiceOrder);

  /** Inicia o Saga logo após a criação da OS. */
  async start(order: ServiceOrder): Promise<void> {
    const sagaId = randomUUID();
    order.sagaId = sagaId;
    order.status = "AGUARDANDO_ORCAMENTO";
    await this.repo().save(order);

    await publishEvent("billing.gerar-orcamento", {
      sagaId,
      orderId: order.id,
      diagnostics: (order.diagnostics || []).map((d) => ({
        title: d.title,
        includeInBudget: d.includeInBudget,
      })),
    });
  }

  /** Cliente aprovou o orçamento -> pede o pagamento ao Billing. */
  async approve(orderId: number): Promise<ServiceOrder> {
    const order = await this.repo().findOneByOrFail({ id: orderId });
    if (order.status !== "AGUARDANDO_APROVACAO") {
      throw new Error("OS não está aguardando aprovação");
    }
    order.approved = true;
    order.approvedAt = new Date();
    await this.repo().save(order);

    await publishEvent("billing.processar-pagamento", {
      sagaId: order.sagaId,
      orderId: order.id,
      amountCents: order.budgetCents,
    });
    return order;
  }

  /**
   * Registra todos os consumidores de eventos do Saga.
   * Chamado uma vez na inicialização do servidor.
   */
  async registerHandlers(): Promise<void> {
    // Billing terminou de gerar o orçamento
    await subscribe("os.orcamento-gerado", "os.orcamento-gerado", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      order.budgetCents = msg.amountCents;
      order.status = "AGUARDANDO_APROVACAO";
      await this.repo().save(order);
    });

    // Orçamento falhou -> compensação
    await subscribe("os.orcamento-falhou", "os.orcamento-falhou", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      order.status = "CANCELADA";
      order.observation = `Orçamento falhou: ${msg.reason || "erro"}`;
      await this.repo().save(order);
    });

    // Pagamento aprovado -> manda executar
    await subscribe("os.pagamento-aprovado", "os.pagamento-aprovado", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      await publishEvent("execution.iniciar", {
        sagaId: order.sagaId,
        orderId: order.id,
      });
    });

    // Pagamento recusado -> compensação (volta para aprovação)
    await subscribe("os.pagamento-recusado", "os.pagamento-recusado", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      order.approved = false;
      order.approvedAt = null as any;
      order.status = "AGUARDANDO_APROVACAO";
      order.observation = `Pagamento recusado: ${msg.reason || "erro"}`;
      await this.repo().save(order);
    });

    // Execução iniciada
    await subscribe("os.execucao-iniciada", "os.execucao-iniciada", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      order.status = "EM_EXECUCAO";
      order.startedAt = new Date();
      await this.repo().save(order);
    });

    // Execução finalizada
    await subscribe("os.execucao-finalizada", "os.execucao-finalizada", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      order.status = "FINALIZADA";
      order.finishedAt = new Date();
      await this.repo().save(order);
    });

    // Execução falhou -> compensação: estorna pagamento e cancela
    await subscribe("os.execucao-falhou", "os.execucao-falhou", async (msg) => {
      const order = await this.repo().findOneBy({ id: msg.orderId });
      if (!order) return;
      await publishEvent("billing.estornar-pagamento", {
        sagaId: order.sagaId,
        orderId: order.id,
      });
      order.status = "CANCELADA";
      order.observation = `Execução falhou: ${msg.reason || "erro"}`;
      await this.repo().save(order);
    });
  }
}

export const sagaOrchestrator = new SagaOrchestrator();
