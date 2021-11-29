import assertString from "./util_assertString";

import isHexadecimal from "./isHexadecimal";

export default function isMongoId(str) {
  assertString(str);
  return isHexadecimal(str) && str.length === 24;
}
