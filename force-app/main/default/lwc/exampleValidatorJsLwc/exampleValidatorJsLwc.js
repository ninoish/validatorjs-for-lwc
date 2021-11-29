import { LightningElement } from "lwc";
import validatorjs, { isEmail, isLength, length } from "c/validatorjs";

export default class ExampleValidatorJsLwc extends LightningElement {
  connectedCallback() {
    const urlValidation = validatorjs.isURL("https://google.com");
    const emailValidation = isEmail("hello world");
    const lengthCheck = {
      1: isLength('あいうえお', {min: 5, max: 5}),
      2: isLength('✌️', {min: 1, max: 1}),
      3: isLength('😀', {min: 1, max: 1}),
      4: isLength('🏴󠁧󠁢󠁷󠁬󠁳󠁿', {min: 1, max: 1}),
      5: length('🏴󠁧󠁢󠁷󠁬󠁳󠁿'),
      6: length('✌️')
    }

    console.log(urlValidation, emailValidation, lengthCheck);
  }
}
