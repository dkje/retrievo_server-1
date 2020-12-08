import {
  Resolver,
  Ctx,
  Arg,
  Query,
  Mutation,
  UseMiddleware,
} from "type-graphql";
import { getCustomRepository, getRepository } from "typeorm";

/* Entities */
import Task from "../entities/Task";
import Board from "../entities/Board";
import Project from "../entities/Project";
import Sprint from "../entities/Sprint";
import TaskRepository from "../repository/TaskCustomRepository";

/* Utils */
// import { prod } from "../constants";
import generateError, { errorKeys } from "../utils/ErrorFactory";

/* Types */
import { MyContext } from "../types";
import TaskResponse from "./types/TaskResponse";
import TaskCreateInput from "./types/TaskCreateInput";
import TaskUpdateInput from "./types/TaskUpdateInput";

// /* Middleware */
// import checkIfGuest from "../middleware/checkIfGuest";
import checkAuthStatus from "../middleware/checkAuthStatus";
// import checkAdminPermission from "../middleware/checkAdminPermission";
// import checkProjectPermission from "../middleware/checkProjectPermission";

// TODO : notification
@Resolver()
export class TaskResolver {
  @Query(() => TaskResponse)
  @UseMiddleware([checkAuthStatus]) // FIXME : checkProjectPermission
  async getTask(@Arg("id") id: string): Promise<TaskResponse> {
    try {
      // const task = await Task.findOne({
      //   where: { id },
      //   relations: [
      //     "board",
      //     "sprint",
      //     "userTask",
      //     "userTask.user",
      //     "taskLabel",
      //     "taskLabel.label",
      //     "file",
      //     "comment",
      //     "comment.user",
      //   ],
      // });

      const task = await getRepository(Task)
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.board", "board")
        .leftJoinAndSelect("task.sprint", "sprint")
        .leftJoinAndSelect("task.userTask", "userTask")
        .leftJoinAndSelect("userTask.user", "taskUser")
        .leftJoinAndSelect("task.taskLabel", "taskLabel")
        .leftJoinAndSelect("taskLabel.label", "label")
        .leftJoinAndSelect("task.file", "file")
        .leftJoinAndSelect("task.comment", "comment")
        .leftJoinAndSelect("comment.user", "commentUser")
        .where("task.id = :taskId")
        .setParameter("taskId", id)
        .orderBy("comment.createdAt", "ASC")
        .getOne();

      if (!task) return { error: generateError(errorKeys.DATA_NOT_FOUND) };
      return { task: [task] };
    } catch (err) {
      console.log("Task Read Query Error:", err);
      return { error: generateError(errorKeys.INTERNAL_SERVER_ERROR) };
    }
  }

  @Mutation(() => TaskResponse)
  @UseMiddleware([checkAuthStatus]) // FIXME : checkProjectPermission
  async createTask(
    @Arg("options") options: TaskCreateInput,
    @Ctx() { req }: MyContext
  ): Promise<TaskResponse> {
    const projectId =
      req.query.projectId || "7bc19d32-c4b4-404f-8cd1-b77379c29fa0";
    console.log("projectId:", projectId);
    try {
      const { title, boardId, sprintId } = options;

      const project = await Project.findOne({ where: { id: projectId } });
      if (!project) return { error: generateError(errorKeys.BAD_REQUEST) };

      const sprint = await Sprint.findOne({
        where: { id: sprintId },
        relations: ["task"],
      });

      if (!sprint) return { error: generateError(errorKeys.BAD_REQUEST) };
      const sprintRowIndex = sprint.task?.length;

      let board;
      let boardRowIndex;
      if (sprint.didStart) {
        // spirnt가 didstart이면
        if (boardId) {
          board = await Board.findOne({
            where: { id: boardId },
            relations: ["task"],
          });
        } else {
          board = await Board.findOne({
            where: {
              project,
              boardColumnIndex: 0,
            },
            relations: ["task"],
          });
        }
        if (!board) return { error: generateError(errorKeys.DATA_NOT_FOUND) };
        boardRowIndex = board.task?.length;
      }
      let task;
      if (board) {
        task = await Task.create({
          title,
          sprint,
          project,
          board,
          boardRowIndex,
          sprintRowIndex,
        }).save();
        console.log("task", task);
      } else {
        task = await Task.create({
          title,
          sprint,
          project,
          sprintRowIndex,
        }).save();
      }

      if (!task)
        return { error: generateError(errorKeys.INTERNAL_SERVER_ERROR) };

      return { task: [task] };
    } catch (err) {
      console.log("Task create Mutation error:", err);
      return { error: generateError(errorKeys.INTERNAL_SERVER_ERROR) };
    }
  }

  @Mutation(() => TaskResponse)
  @UseMiddleware([checkAuthStatus]) // FIXME : checkProjectPermission
  async updateTask(
    @Arg("options") options: TaskUpdateInput
  ): Promise<TaskResponse> {
    try {
      const taskRepository = getCustomRepository(TaskRepository);
      const res = await taskRepository.updateTaskAndChangeIndex(options);
      if (!res) return { error: generateError(errorKeys.BAD_REQUEST) };

      const task = await getRepository(Task)
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.board", "board")
        .leftJoinAndSelect("task.sprint", "sprint")
        .leftJoinAndSelect("task.userTask", "userTask")
        .leftJoinAndSelect("userTask.user", "taskUser")
        .leftJoinAndSelect("task.taskLabel", "taskLabel")
        .leftJoinAndSelect("taskLabel.label", "label")
        .leftJoinAndSelect("task.file", "file")
        .leftJoinAndSelect("task.comment", "comment")
        .leftJoinAndSelect("comment.user", "commentUser")
        .where("task.id = :taskId")
        .setParameter("taskId", options.id)
        .orderBy("comment.createdAt", "ASC")
        .getOne();

      console.log("task:", task);
      console.log("taskId", options.id);
      if (!task) return { error: generateError(errorKeys.DATA_NOT_FOUND) };
      return { task: [task] };
    } catch (err) {
      console.log("Board create Mutation error:", err);
      return { error: generateError(errorKeys.INTERNAL_SERVER_ERROR) };
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware([checkAuthStatus]) // FIXME : checkProjectPermission
  async deleteTask(@Arg("id") id: string): Promise<boolean> {
    try {
      const taskRepository = getCustomRepository(TaskRepository);
      return await taskRepository.deleteTaskAndChangeIndice(id);
    } catch (err) {
      console.log("Board delete Mutation error catch:", err);
      return false;
    }
  }
}

export default TaskResolver;
