import amqplib, { Channel } from "amqplib";

/**
 * Camada de mensageria com RabbitMQ.
 *
 * O OS Service publica comandos para os outros serviços e consome os eventos
 * de resposta. Usamos um exchange do tipo "topic" chamado "oficina.saga",
 * onde cada mensagem tem uma routing key (ex: "billing.gerar-orcamento",
 * "os.orcamento-gerado").
 */
const EXCHANGE = "oficina.saga";

let connection: any = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
  connection = await amqplib.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  return channel;
}

/**
 * Publica um evento/comando no barramento.
 */
export async function publishEvent(routingKey: string, payload: object): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: "application/json",
  });
}

/**
 * Assina uma routing key e processa cada mensagem recebida.
 */
export async function subscribe(
  queue: string,
  routingKey: string,
  handler: (payload: any) => Promise<void>
): Promise<void> {
  const ch = await connectRabbitMQ();
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, EXCHANGE, routingKey);

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error(JSON.stringify({
        level: "error",
        message: "erro ao processar mensagem",
        queue,
        routingKey,
        error: (err as Error).message,
      }));
      // nack sem requeue infinito — em produção iria para uma dead-letter queue
      ch.nack(msg, false, false);
    }
  });
}

export async function closeRabbitMQ(): Promise<void> {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
}

export { EXCHANGE };
