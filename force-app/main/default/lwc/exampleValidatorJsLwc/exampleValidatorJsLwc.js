import { LightningElement } from "lwc";
import validatorjs, { isEmail } from "c/validatorjs";

export default class ExampleValidatorJsLwc extends LightningElement {
  connectedCallback() {
    const urlValidation = validatorjs.isURL("https://google.com");
    const emailValidation = isEmail("hello world");

    console.log(urlValidation, emailValidation);
  }
}
