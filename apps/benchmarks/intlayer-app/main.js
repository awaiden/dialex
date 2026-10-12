import { installIntlayer, useIntlayer } from "vanilla-intlayer";

installIntlayer();
const content = useIntlayer("bench");
console.log(content.plural(globalThis.n)({ count: globalThis.n }));
