import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from "typeorm";
import Project from "./Project";
import Task from "./Task";
import SprintNotification from "./SprintNotification";

@ObjectType()
@Entity()
export default class Sprint extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field()
  @Column()
  title!: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => Boolean, { defaultValue: false })
  @Column({ name: "did_start", default: false })
  didStart!: boolean;

  @Field(() => Boolean, { defaultValue: false })
  @Column({ name: "is_completed", default: false })
  isCompleted!: boolean;

  @Field(() => Number)
  @Column({ name: "row" })
  row!: number;

  @Field(() => String, { nullable: true })
  @Column({ type: "timestamp", name: "due_date", nullable: true })
  dueDate?: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: "timestamp", name: "started_at", nullable: true })
  startedAt?: Date;

  @Field(() => String)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Field(() => String)
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(() => Project, (project) => project.sprint, {
    onDelete: "CASCADE",
  })
  @Field(() => Project)
  @JoinColumn({ name: "project_id" })
  project!: Project | string;

  @Field(() => [SprintNotification])
  @OneToMany(
    () => SprintNotification,
    (sprintNotification) => sprintNotification.sprint
  )
  sprintNotification?: SprintNotification[];

  @Field(() => [Task])
  @OneToMany(() => Task, (task) => task.sprint)
  task?: Task[];
}
