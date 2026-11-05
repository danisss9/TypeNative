import type { OptionsWithDefaults } from "../options.ts";
import type { CommentWhitespace } from "../parser/comments.ts";
import { Position } from "../util/location.ts";

import { types as ct, type TokContext } from "./context.ts";
import { tt, type TokenType } from "./types.ts";
import type { Errors } from "../parse-error.ts";
import type { ParseError } from "../parse-error.ts";

export type DeferredStrictError =
  | typeof Errors.StrictNumericEscape
  | typeof Errors.StrictOctalLiteral;

type TopicContextState = {
  // When a topic binding has been currently established,
  // then this is 1. Otherwise, it is 0. This is forwards compatible
  // with a future plugin for multiple lexical topics.
  maxNumOfResolvableTopics: number;
  // When a topic binding has been currently established, and if that binding
  // has been used as a topic reference `#`, then this is 0. Otherwise, it is
  // `null`. This is forwards compatible with a future plugin for multiple
  // lexical topics.
  maxTopicIndex: null | 0;
};

export const enum LoopLabelKind {
  Loop = 1,
  Switch = 2,
}



export default class State {
  flags: number = 1024;

  get strict() {
    return (this.flags & 1) > 0;
  }
  set strict(v) {
    if (v) this.flags |= 1;
    else this.flags &= -2;
  }

  startIndex!: number;
  curLine!: number;
  lineStart!: number;

  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  startLoc!: Position;
  endLoc!: Position;

  init({
    strictMode,
    sourceType,
    startIndex,
    startLine,
    startColumn,
  }: OptionsWithDefaults): void {
    this.strict =
      strictMode === false
        ? false
        : strictMode === true
          ? true
          : sourceType === "module";

    this.startIndex = startIndex;
    this.curLine = startLine;
    this.lineStart = -startColumn;
    this.startLoc = this.endLoc = new Position(
      startLine,
      startColumn,
      startIndex,
    );
  }

  errors: ParseError<any>[] = [];

  // Used to signify the start of a potential arrow function
  potentialArrowAt: number = -1;

  // Used to signify the start of an expression which looks like a
  // typed arrow function, but it isn't
  // e.g. a ? (b) : c => d
  //          ^
  noArrowAt: number[] = [];

  // Used to signify the start of an expression whose params, if it looks like
  // an arrow function, shouldn't be converted to assignable nodes.
  // This is used to defer the validation of typed arrow functions inside
  // conditional expressions.
  // e.g. a ? (b) : c => d
  //          ^
  noArrowParamsConversionAt: number[] = [];

  // The end of the last token after which `/` or `/=` starts a regular
  // expression although the parser has already parsed an expression before
  // it: the `}` of an arrow function body or an argument-less `yield`.
  // e.g. () => {}
  //             ^
  //      /=/
  regExpAllowedAt: number = -1;

  // Flags to track
  get maybeInArrowParameters() {
    return (this.flags & 2) > 0;
  }
  set maybeInArrowParameters(v) {
    if (v) this.flags |= 2;
    else this.flags &= -3;
  }
  get inType() {
    return (this.flags & 4) > 0;
  }
  set inType(v) {
    if (v) this.flags |= 4;
    else this.flags &= -5;
  }
  get noAnonFunctionType() {
    return (this.flags & 8) > 0;
  }
  set noAnonFunctionType(v) {
    if (v) this.flags |= 8;
    else this.flags &= -9;
  }
  get hasFlowComment() {
    return (this.flags & 16) > 0;
  }
  set hasFlowComment(v) {
    if (v) this.flags |= 16;
    else this.flags &= -17;
  }
  get isAmbientContext() {
    return (this.flags & 32) > 0;
  }
  set isAmbientContext(v) {
    if (v) this.flags |= 32;
    else this.flags &= -33;
  }
  get inAbstractClass() {
    return (this.flags & 64) > 0;
  }
  set inAbstractClass(v) {
    if (v) this.flags |= 64;
    else this.flags &= -65;
  }
  get inDisallowConditionalTypesContext() {
    return (this.flags & 128) > 0;
  }
  set inDisallowConditionalTypesContext(v) {
    if (v) this.flags |= 128;
    else this.flags &= -129;
  }
  get inConditionalConsequent() {
    return (this.flags & 256) > 0;
  }
  set inConditionalConsequent(v) {
    if (v) this.flags |= 256;
    else this.flags &= -257;
  }

  // For the Hack-style pipelines plugin
  topicContext: TopicContextState = {
    maxNumOfResolvableTopics: 0,
    maxTopicIndex: null,
  };

  // For the F#-style pipelines plugin
  get soloAwait() {
    return (this.flags & 512) > 0;
  }
  set soloAwait(v) {
    if (v) this.flags |= 512;
    else this.flags &= -513;
  }

  // Labels in scope.
  labels: {
    kind: LoopLabelKind | null;
    name?: string | null;
    statementStart?: number;
  }[] = [];

  commentsLen = 0;
  // Comment attachment store
  commentStack: CommentWhitespace[] = [];

  // The current position of the tokenizer in the input.
  pos: number = 0;

  // Properties of the current token:
  // Its type
  type: TokenType = tt.eof;

  // For tokens that include more information than their type, the value
  value: any = null;

  // Its start and end offset
  start: number = 0;
  end: number = 0;

  // Position information for the previous token
  // this is initialized when generating the second token.
  lastTokEndLoc: Position | null = null;
  // this is initialized when generating the second token.
  lastTokStartLoc: Position | null = null;

  // The context stack is used to track whether the apostrophe "`" starts
  // or ends a string template
  context: TokContext[] = [ct.brace];

  // Used to track whether a JSX element is allowed to form
  get canStartJSXElement() {
    return (this.flags & 1024) > 0;
  }
  set canStartJSXElement(v) {
    if (v) this.flags |= 1024;
    else this.flags &= -1025;
  }

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  get containsEsc() {
    return (this.flags & 2048) > 0;
  }
  set containsEsc(v) {
    if (v) this.flags |= 2048;
    else this.flags &= -2049;
  }

  // Used to track invalid escape sequences in template literals,
  // that must be reported if the template is not tagged.
  firstInvalidTemplateEscapePos: null | Position = null;

  get hasTopLevelAwait() {
    return (this.flags & 4096) > 0;
  }
  set hasTopLevelAwait(v) {
    if (v) this.flags |= 4096;
    else this.flags &= -4097;
  }

  // This property is used to track the following errors
  // - StrictNumericEscape
  // - StrictOctalLiteral
  //
  // in a literal that occurs prior to/immediately after a "use strict" directive.

  // todo(JLHwung): set strictErrors to null and avoid recording string errors
  // after a non-directive is parsed
  strictErrors = new Map<number, [DeferredStrictError, Position]>();

  // Tokens length in token store
  tokensLength: number = 0;

  /**
   * When we add a new property, we must manually update the `clone` method
   * @see State#clone
   */

  curPosition(): Position {
    return new Position(
      this.curLine,
      this.pos - this.lineStart,
      this.pos + this.startIndex,
    );
  }

  clone(): State {
    const state = new State();
    state.flags = this.flags;
    state.startIndex = this.startIndex;
    state.curLine = this.curLine;
    state.lineStart = this.lineStart;
    state.startLoc = this.startLoc;
    state.endLoc = this.endLoc;
    state.errors = this.errors.slice();
    state.potentialArrowAt = this.potentialArrowAt;
    state.noArrowAt = this.noArrowAt.slice();
    state.noArrowParamsConversionAt = this.noArrowParamsConversionAt.slice();
    state.topicContext = this.topicContext;
    state.regExpAllowedAt = this.regExpAllowedAt;
    state.labels = this.labels.slice();
    state.commentsLen = this.commentsLen;
    state.commentStack = this.commentStack.slice();
    state.pos = this.pos;
    state.type = this.type;
    state.value = this.value;
    state.start = this.start;
    state.end = this.end;
    state.lastTokEndLoc = this.lastTokEndLoc;
    state.lastTokStartLoc = this.lastTokStartLoc;
    state.context = this.context.slice();
    state.firstInvalidTemplateEscapePos = this.firstInvalidTemplateEscapePos;
    state.strictErrors = this.strictErrors;
    state.tokensLength = this.tokensLength;

    return state;
  }
}

export type LookaheadState = {
  pos: number;
  value: any;
  type: TokenType;
  start: number;
  end: number;
  context: TokContext[];
  startLoc: Position;
  lastTokEndLoc: Position | null;
  curLine: number;
  lineStart: number;
  curPosition: State["curPosition"];
  /* Used only in readToken_mult_modulo */
  inType: boolean;
  /* Used only in readNumber */
  strict: boolean;
  // These boolean properties are not initialized in createLookaheadState()
  // instead they will only be set by the tokenizer
  containsEsc?: boolean;
};
