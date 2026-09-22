import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from "typeorm";
import { Diagnostic } from "./Diagnostic";

/**
 * Ordem de Serviço — entidade central do OS Service.
 *
 * Diferença para o monólito da Fase 3: aqui a OS NÃO tem relações diretas
 * com Service, Part ou ServiceExecution — essas responsabilidades pertencem
 * aos serviços Billing e Execution. A OS guarda apenas os dados que possui
 * (cliente e veículo embutidos) e o estado do fluxo (Saga).
 *
 * Status do Saga:
 * RECEBIDA -> AGUARDANDO_ORCAMENTO -> AGUARDANDO_APROVACAO ->
 * EM_EXECUCAO -> FINALIZADA -> ENTREGUE
 * (ou CANCELADA em caso de compensação/rollback)
 */
@Entity("service_orders")
export class ServiceOrder {
  @PrimaryGeneratedColumn()
  id: number;

  // Dados do cliente embutidos (o OS Service é dono dessa cópia)
  @Column({ type: "varchar", length: 20 })
  clientDocument: string;

  @Column({ type: "varchar", length: 120 })
  clientName: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  clientEmail: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  clientPhone: string;

  // Dados do veículo embutidos
  @Column({ type: "varchar", length: 10 })
  vehiclePlate: string;

  @Column({ type: "varchar", length: 60, nullable: true })
  vehicleBrand: string;

  @Column({ type: "varchar", length: 60, nullable: true })
  vehicleModel: string;

  @Column({ type: "int", nullable: true })
  vehicleYear: number;

  @OneToMany(() => Diagnostic, (d) => d.serviceOrder, { cascade: true })
  diagnostics: Diagnostic[];

  @Column({ type: "boolean", default: false })
  approved: boolean;

  // Valor do orçamento devolvido pelo Billing Service (em centavos para evitar float)
  @Column({ type: "bigint", default: 0 })
  budgetCents: number;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date;

  @Column({ type: "varchar", length: 50, default: "RECEBIDA" })
  status: string;

  // Correlação do Saga — rastreia o fluxo distribuído entre os serviços
  @Column({ type: "varchar", length: 60, nullable: true })
  sagaId: string;

  @Column("text", { nullable: true })
  observation: string;

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  finishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
