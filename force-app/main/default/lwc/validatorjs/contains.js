import assertString from "./util_assertString";
import toString from "./util_toString";
import merge from "./util_merge";

const defaulContainsOptions = {
  ignoreCase: false,
  minOccurrences: 1
};

export default function contains(str, elem, options) {
  assertString(str);
  options = merge(options, defaulContainsOptions);

  if (options.ignoreCase) {
    return (
      str.toLowerCase().split(toString(elem).toLowerCase()).length >
      options.minOccurrences
    );
  }

  return str.split(toString(elem)).length > options.minOccurrences;
}
