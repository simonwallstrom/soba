import { validator } from "hono/validator";
import * as v from "valibot";

export function validateJson<T extends v.GenericSchema>(schema: T) {
  return validator("json", (value, c) => {
    const result = v.safeParse(schema, value);
    if (!result.success) {
      return c.json({ error: result.issues[0]?.message ?? "Invalid request" }, 400);
    }
    return result.output;
  });
}
