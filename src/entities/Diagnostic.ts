import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { ServiceOrder } from "./ServiceOrder";

/**
 * Diagnóstico técnico de uma OS.
 * Mantido no OS Service porque faz parte do ciclo de vida da ordem.
 * Os serviços/peças recomendados ficam como texto/JSON leve —
 * o cálculo de preço é responsabilidade do Billing Service.
 */
@Entity("diagnostics")
export class Diagnostic {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ServiceOrder, (so) => so.diagnostics, { onDelete: "CASCADE" })
  serviceOrder: ServiceOrder;

  @Column({ type: "varchar", length: 160 })
  title: string;

  @Column("text", { nullable: true })
  description: string;

  @Column({ type: "boolean", default: true })
  includeInBudget: boolean;

  @Column({ type: "varchar", length: 20, default: "media" })
  priority: string;

  @Column("text", { nullable: true })
  mechanicNote: string;

  @CreateDateColumn()
  createdAt: Date;
}
