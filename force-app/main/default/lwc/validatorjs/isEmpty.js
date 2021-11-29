import assertString from "./util_assertString";
import merge from "./util_merge";

const default_is_empty_options = {
  ignore_whitespace: false
};

export default function isEmpty(str, options) {
  assertString(str);
  options = merge(options, default_is_empty_options);

  return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
}
