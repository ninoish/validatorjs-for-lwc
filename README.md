# validator.js for LWC

Make [validator.js](https://github.com/validatorjs/validator.js) available in your LWC component.
This repository just moved the source code of validator.js under an lwc folder (lwc/validatorjs), and modified the file path.

## Validationjs version : 13.7.0

## How to use

import validatorjs lwc component in your lwc by follow.

```default import
import validatorjs from 'c/validatorjs';

validatorjs.isURL('https://google.com');

```

```named import
import { isEmail } from 'c/validatorjs';

const emailValidation = isEmail('hello world');
```

## Available methods

Please see [the document](https://github.com/validatorjs/validator.js#validators).
