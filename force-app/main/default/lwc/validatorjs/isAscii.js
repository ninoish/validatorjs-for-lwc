import assertString from "./util_assertString";

/* eslint-disable no-control-regex */
const ascii = /^[\x00-\x7F]+$/;
/* eslint-enable no-control-regex */

export default function isAscii(str) {
  assertString(str);
  return ascii.test(str);
}
