import type * as errors from "../core/errors.ts";
import uk from "./uk.ts";

/** @deprecated Use `uk` instead. */
export default function (): { localeError: errors.$ZodErrorMap } {
  return uk();
}
