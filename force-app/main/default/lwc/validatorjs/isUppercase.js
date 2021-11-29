import assertString from "./util_assertString";

export default function isUppercase(str) {
  assertString(str);
  return str === str.toUpperCase();
}
