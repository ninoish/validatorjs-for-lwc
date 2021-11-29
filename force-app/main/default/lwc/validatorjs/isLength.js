import assertString from "./util_assertString";
import length from "./length";

/* eslint-disable prefer-rest-params */
export default function isLength(str, options) {
  assertString(str);
  let min;
  let max;
  if (typeof options === "object") {
    min = options.min || 0;
    max = options.max;
  } else {
    // backwards compatibility: isLength(str, min [, max])
    min = arguments[1] || 0;
    max = arguments[2];
  }

  const len = length(str);
  return len >= min && (typeof max === "undefined" || len <= max);
}
