import assertString from "./util_assertString";

export const halfWidth =
  /[\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;

export default function isHalfWidth(str) {
  assertString(str);
  return halfWidth.test(str);
}
