import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { from, switchMap, type Observable } from "rxjs";

import { DialexService } from "./service.js";
import type { DictionaryKey, ResolveDictionaryType } from "./types.js";

/**
 * NestJS interceptor that automatically attaches resolved locale and dictionary accessor to requests.
 */
@Injectable()
export class DialexInterceptor implements NestInterceptor {
  constructor(private dialexService: DialexService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const run = async () => {
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse();

      if (req) {
        const locale = this.dialexService.resolveLocale(req);
        req.locale = locale;
        req.getDictionary = <K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T =>
          this.dialexService.getDictionary(name, locale);

        if (res && typeof res.setHeader === "function") {
          res.setHeader("Content-Language", locale);
        }
      }
    };

    // Finish locale resolution before the handler runs; failures reach Nest's exception pipeline
    return from(run()).pipe(switchMap(() => next.handle()));
  }
}
