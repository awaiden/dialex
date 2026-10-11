import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "#start/dialex.generated";

// Sets ctx.locale and ctx.getDictionary(name) for every request, and the Content-Language header
export default createDialexMiddleware({ ...dialex });
