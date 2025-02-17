import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import Project from "./Project";
import TaskLabel from "./TaskLabel";

@ObjectType()
@Entity()
export default class Label extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field(() => String)
  @Column()
  name!: string;

  @Field()
  @Column()
  color!: string;

  @ManyToOne(() => Project, (project) => project.label, {
    onDelete: "CASCADE",
  })
  @Field(() => Project)
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @OneToMany(() => TaskLabel, (taskLabel) => taskLabel.label)
  @Field(() => [TaskLabel])
  taskLabel?: TaskLabel[];
}
