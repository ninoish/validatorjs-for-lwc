import assertString from "./util_assertString";

export default function isWhitelisted(str, chars) {
  assertString(str);
  for (let i = str.length - 1; i >= 0; i--) {
    if (chars.indexOf(str[i]) === -1) {
      return false;
    }
  }
  return true;
}
