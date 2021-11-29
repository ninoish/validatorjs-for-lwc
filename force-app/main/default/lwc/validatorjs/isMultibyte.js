import assertString from "./util_assertString";

/* eslint-disable no-control-regex */
const multibyte = /[^\x00-\x7F]/;
/* eslint-enable no-control-regex */

export default function isMultibyte(str) {
  assertString(str);
  return multibyte.test(str);
}
