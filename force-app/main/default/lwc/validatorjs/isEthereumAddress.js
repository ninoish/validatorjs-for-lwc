import assertString from "./util_assertString";

const eth = /^(0x)[0-9a-f]{40}$/i;

export default function isEthereumAddress(str) {
  assertString(str);
  return eth.test(str);
}
