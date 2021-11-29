# validator.js for LWC

Provides form validation methods powered by [validator.js](https://github.com/validatorjs/validator.js) in your lightning web component.
All methods of validator.js are available, and also `length(str)` method that returns the emoji-aware number of string length is available.

## Ported validator.js version
[13.7.0](https://github.com/validatorjs/validator.js/releases/tag/13.7.0)

Besides validator.js, it also uses [grapheme-splitter/next](https://github.com/JLHwung/grapheme-splitter/tree/next) to count precise length of chars.

## Available methods

Please see [the validator.js document](https://github.com/validatorjs/validator.js#validators) for methods.

In addition, this library provides `length(str)` method to count precise string length with unicode + salogate pair (complex emojis) aware.

## How to use

import validatorjs lwc component in your lwc by follow.

```js
// default import
import validatorjs from 'c/validatorjs';

const isUrlFormat = validatorjs.isURL('https://google.com'); // true
const lengthOfChars = validatorjs.length('🏴󠁧󠁢󠁷󠁬󠁳󠁿'); // 1
```

```js
// named import
import { isEmail, length } from 'c/validatorjs';

const isEmailFormat = isEmail('hello world'); // false
const lengthOfChars = length('😀'); // 1
```

