import assertString from "./util_assertString";

export default function matches(str, pattern, modifiers) {
  assertString(str);
  if (Object.prototype.toString.call(pattern) !== "[object RegExp]") {
    pattern = new RegExp(pattern, modifiers);
  }
  return pattern.test(str);
}
