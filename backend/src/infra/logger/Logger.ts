import pino from "pino";
import config from "../../config";
import type { ILogger } from "../../infra-ports/ILogger";

const isDev = process.env.NODE_ENV !== "production";

const rootLogger = pino({
  level: config.server.logLevel,
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
});

export class Logger implements ILogger {
  private readonly logger: pino.Logger;

  constructor(component: string) {
    this.logger = rootLogger.child({ component });
  }

  debug(msg: string, context?: object): void {
    this.logger.debug(context ?? {}, msg);
  }

  info(msg: string, context?: object): void {
    this.logger.info(context ?? {}, msg);
  }

  warn(msg: string, context?: object): void {
    this.logger.warn(context ?? {}, msg);
  }

  error(msg: string, context?: object | Error): void {
    if (context instanceof Error) {
      this.logger.error({ err: context }, msg);
    } else {
      this.logger.error(context ?? {}, msg);
    }
  }
}
