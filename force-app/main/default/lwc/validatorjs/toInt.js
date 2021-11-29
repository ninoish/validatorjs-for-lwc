import assertString from "./util_assertString";

export default function toInt(str, radix) {
  assertString(str);
  return parseInt(str, radix || 10);
}
