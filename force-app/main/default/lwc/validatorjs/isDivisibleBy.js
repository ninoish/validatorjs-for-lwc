import assertString from "./util_assertString";
import toFloat from "./toFloat";

export default function isDivisibleBy(str, num) {
  assertString(str);
  return toFloat(str) % parseInt(num, 10) === 0;
}
