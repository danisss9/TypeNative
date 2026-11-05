import type * as errors from "../core/errors.ts";
import km from "./km.ts";

/** @deprecated Use `km` instead. */
export default function (): { localeError: errors.$ZodErrorMap } {
  return km();
}
