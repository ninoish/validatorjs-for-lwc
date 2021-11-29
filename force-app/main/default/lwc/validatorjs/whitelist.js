import assertString from "./util_assertString";

export default function whitelist(str, chars) {
  assertString(str);
  return str.replace(new RegExp(`[^${chars}]+`, "g"), "");
}
