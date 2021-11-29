import assertString from "./util_assertString";

export default function equals(str, comparison) {
  assertString(str);
  return str === comparison;
}
