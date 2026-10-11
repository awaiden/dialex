import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";
import { z } from "zod";

import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

// The locale and the dictionaries are part of every procedure's context
export const createContext = ({
  req,
}: {
  req: { headers: Record<string, string | string[] | undefined>; url?: string };
}) => ({
  ...resolveDialex(req),
});

const t = initTRPC.context<ReturnType<typeof createContext>>().create();

export const appRouter = t.router({
  home: t.procedure.query(({ ctx }) => {
    const dict = ctx.getDictionary("home");
    return { locale: ctx.locale, title: dict.title, description: dict.description };
  }),
  greet: t.procedure.input(z.object({ name: z.string() })).query(({ ctx, input }) => {
    const dict = ctx.getDictionary("home");
    return { locale: ctx.locale, message: dict.greeting(input.name) };
  }),
});

export type AppRouter = typeof appRouter;
