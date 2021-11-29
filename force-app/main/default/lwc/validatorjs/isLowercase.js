import assertString from "./util_assertString";

export default function isLowercase(str) {
  assertString(str);
  return str === str.toLowerCase();
}
