import assertString from "./util_assertString";

const md5 = /^[a-f0-9]{32}$/;

export default function isMD5(str) {
  assertString(str);
  return md5.test(str);
}
