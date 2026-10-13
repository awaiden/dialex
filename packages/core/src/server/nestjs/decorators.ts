import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Locales } from "../../core/registry.js";

/**
 * Parameter decorator that extracts the resolved locale from the request.
 */
export const DialexLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Locales => {
    const req = ctx.switchToHttp().getRequest();
    return req?.locale || "en";
  },
);

/**
 * Parameter decorator that injects the resolved dictionary into a controller parameter.
 */
export const DialexDictionary = createParamDecorator(
  (dictionaryName: string, ctx: ExecutionContext): any => {
    const req = ctx.switchToHttp().getRequest();
    if (typeof req?.getDictionary === "function") {
      return req.getDictionary(dictionaryName);
    }
    return undefined;
  },
);
