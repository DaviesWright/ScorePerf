// Lets `node --test` import extensionless TypeScript files (e.g. "../src/auth"), as tsc and wrangler do.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (err) {
          if (err.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\\.\\w+$/.test(specifier)) {
            return next(specifier + ".ts", context);
          }
          throw err;
        }
      }
    `),
);
