# require-mini [![Build](https://travis-ci.org/just-boris/require-mini.svg?branch=master)](https://travis-ci.org/just-boris/require-mini)

> Tiny replacement of require.js powered by promises

## Overview

It's library with [require.js](https://github.com/jrburke/requirejs/) compatible API and full-plugin support.
Some of features we don't support for now, but most of functions works properly. Look at examples in our [tests](test).

In the most cases you can just switch from original `require.js` to our `require-mini` without any code modifications.
[Documentation](http://requirejs.org/docs/api.html) from require.js also applicable here.

Because we are using promises, you will get support of asynchronus defines wihout any plugins

```js
define('userData', ['fetch'], function(fetch) {
   return fetch('/api/profile');
});

```

## Caveats

These features is not supported yet, but you can vote for its resolution

* [No CommonJS](https://github.com/just-boris/require-mini/issues/1)
* [No relative paths](https://github.com/just-boris/require-mini/issues/4)
* [No contexts](https://github.com/just-boris/require-mini/issues/8)
* [No data-main attribute support](https://github.com/just-boris/require-mini/issues/9)
* [No define as object](https://github.com/just-boris/require-mini/issues/10)

## Getting started

via Bower

```
bower install require-mini --save
```

