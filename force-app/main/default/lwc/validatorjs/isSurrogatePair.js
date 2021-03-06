import assertString from "./util_assertString";

const surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

export default function isSurrogatePair(str) {
  assertString(str);
  return surrogatePair.test(str);
}
