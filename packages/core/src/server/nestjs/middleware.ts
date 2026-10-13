import { Injectable, type NestMiddleware } from "@nestjs/common";

import { DialexService } from "./service.js";
import type { DictionaryKey, ResolveDictionaryType } from "./types.js";

/**
 * NestJS middleware that attaches resolved locale and dictionary accessor to requests.
 */
@Injectable()
export class DialexMiddleware implements NestMiddleware {
  constructor(private dialexService: DialexService) {}

  use(req: any, res: any, next: (error?: any) => void) {
    const handle = () => {
      if (req) {
        const locale = this.dialexService.resolveLocale(req);
        req.locale = locale;
        req.getDictionary = <K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T =>
          this.dialexService.getDictionary(name, locale);

        if (res && typeof res.setHeader === "function") {
          res.setHeader("Content-Language", locale);
        }
      }
      next();
    };

    handle();
  }
}
