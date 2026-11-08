import {
  createFlowUnionType,
  createTSUnionType,
  createUnionTypeAnnotation,
  isFlowType,
  isTSType,
} from "../../../../types/src/index.ts";
import type * as t from "../../../../types/src/index.ts";

export function createUnionType(
  types: (t.FlowType | t.TSType)[],
): t.FlowType | t.TSType | undefined {
  
    if (types.every(v => isFlowType(v))) {
      if (createFlowUnionType) {
        return createFlowUnionType(types);
      }

      return createUnionTypeAnnotation(types);
    } else if (types.every(v => isTSType(v))) {
      if (createTSUnionType) {
        return createTSUnionType(types);
      }
    }
  
}
