import { Redis } from "ioredis";
import { Session, SessionData } from "express-session";
import { Context } from "graphql-passport/lib/buildContext";

export {};
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface SessionData {
      cookie: any;
    }
  }
}

type UserObject = {
  userId?: string;
}; // FIXME

interface QueryParamIFC {
  [key: string]: string;
}

export interface ParamIFC {
  [key: string]: string;
}

export type MyContext = Context<UserObject> & {
  req: Request & {
    session: Session &
      Partial<SessionData> & {
        passport?: { user?: string };
        projectId?: string;
        invitationToken?: string;
      };
    query: QueryParamIFC;
    params: ParamIFC;
  };
  res: Response;
  redis: Redis;
  isAuthenticated: () => boolean;
  isUnauthenticated: () => boolean;
};
