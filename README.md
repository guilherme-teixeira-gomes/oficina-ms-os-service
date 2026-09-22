# Oficina — OS Service

Microsserviço de **Ordens de Serviço** e **orquestrador do Saga** — Tech Challenge Fase 4 (Grupo MotorMind).

## Propósito

Gerencia o ciclo de vida das Ordens de Serviço (abertura, status, histórico) e atua como **orquestrador central do Saga Pattern**, coordenando o fluxo transacional distribuído entre os três microsserviços.

## Tecnologias

- Node.js 20 + TypeScript + Express
- TypeORM + **PostgreSQL** (banco relacional próprio deste serviço)
- RabbitMQ (mensageria assíncrona)
- Jest + Supertest (testes unitários, integração e BDD)
- Docker + Kubernetes
- GitHub Actions + SonarCloud

## Papel na arquitetura

Este é o **maestro** do Saga orquestrado. Ele não acessa o banco de nenhum outro serviço — comunica-se exclusivamente por eventos via RabbitMQ e, quando necessário, por REST.

```
Cliente ──REST──> OS Service (orquestrador)
                      │
                      ├──amqp: billing.gerar-orcamento──────> Billing Service
                      │<─amqp: os.orcamento-gerado───────────┘
                      │
                      ├──amqp: billing.processar-pagamento──> Billing Service
                      │<─amqp: os.pagamento-aprovado─────────┘
                      │
                      ├──amqp: execution.iniciar────────────> Execution Service
                      │<─amqp: os.execucao-finalizada────────┘
```

## Saga Pattern — Orquestrado

A estratégia escolhida foi o **Saga Orquestrado** (não coreografado). Justificativa:

- Um único ponto de controle do fluxo (o OS Service) torna o estado da transação explícito e rastreável
- Facilita a compensação (rollback) — o orquestrador sabe exatamente em que passo falhou
- Mais simples de testar, depurar e demonstrar

### Fluxo transacional

```
RECEBIDA → AGUARDANDO_ORCAMENTO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA
```

### Compensações (rollback)

| Falha | Compensação |
|-------|-------------|
| Orçamento falhou | OS → CANCELADA |
| Pagamento recusado | OS volta para AGUARDANDO_APROVACAO |
| Execução falhou | Estorna pagamento (billing.estornar-pagamento) + OS → CANCELADA |

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /service-order | Abre uma OS e inicia o Saga |
| GET | /service-order | Lista OS ativas (exclui finalizadas/canceladas) |
| GET | /service-order/:id/status | Consulta status e histórico |
| POST | /service-order/:id/approve | Cliente aprova o orçamento |
| GET | /health | Healthcheck |

## Execução local

```bash
npm install
npm test              # testes
npm run test:coverage # cobertura (>80%)
npm run dev           # sobe o serviço (requer Postgres e RabbitMQ)
```

## Testes

- Unitários em todos os use-cases e no orquestrador do Saga
- Integração das rotas HTTP (Supertest)
- **BDD** do fluxo do Saga (`tests/saga-fluxo.bdd.spec.ts`)
- Cobertura: **~94%** (mínimo exigido: 80%)

## Deploy

Pipeline automática (GitHub Actions):
1. Testes + cobertura + SonarCloud
2. Build e push da imagem Docker
3. Deploy no cluster Kubernetes (EKS)

O serviço possui **banco PostgreSQL próprio e isolado** (`k8s/postgres.yaml`) — nenhum outro serviço acessa este banco.
