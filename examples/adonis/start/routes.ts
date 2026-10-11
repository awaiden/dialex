/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from "@adonisjs/core/services/router";

// The locale comes from the URL prefix, ?locale=, the locale cookie or Accept-Language
router.get("/", async ({ locale, getDictionary }) => {
  const dict = getDictionary("home");
  return { locale, title: dict.title, description: dict.description };
});

// Path-based localized greeting: /en/greet/Alice, /tr/greet/Ahmet
router.get("/:locale/greet/:name", async ({ locale, getDictionary, params }) => {
  const dict = getDictionary("home");
  return { locale, message: dict.greeting(params.name) };
});
