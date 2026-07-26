import { z } from "zod";

export const setLifecycleSchema = z.object({
  active: z.boolean(),
});
