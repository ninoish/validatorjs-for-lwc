import assertString from "./util_assertString";
import GraphemeSplitter from "./graphemes";

/* eslint-disable prefer-rest-params */
export default function length(str) {
  assertString(str);
  const graphemes = new GraphemeSplitter();
  return graphemes.countGraphemes(str);
}
