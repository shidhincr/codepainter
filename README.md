Code Painter
============

[![Build Status](https://secure.travis-ci.org/jedhunsaker/codepainter.png?branch=master)](http://travis-ci.org/jedhunsaker/codepainter)

Code Painter is a JavaScript beautifier that instead of asking you to manually specify the desired formatting style,
can infer it from a code sample provided by you. This could, for instance, be a code snippet from the same project
that your new code is supposed to be integrated with.

It uses the excellent [Esprima parser](http://esprima.org/) by [Ariya Hidayat](http://ariya.ofilabs.com/) (thanks!).

It also uses [EditorConfig](http://editorconfig.org/) to define coding style.

The name is inspired by Word's Format Painter, which does a similar job for rich text.

Usage
-----

For now, it can only be used as a command-line tool but a Web version is in the works.

> ./bin/codepaint -i input.js -s sample.js -o output.js

transforms the input.js file using formatting style from sample.js and writes the output to output.js

*-i* and *-o* can both be ommitted, in that case standard I/O streams will be used.

> ./bin/codepaint -s sample.js < input.js > output.js

The style can still be specified manually with a JSON string as the *--style* argument:

> ./bin/codepaint --style '{ "quote_type": "double" }' < input.js > output.js

Or specify one of the predefined styles:

> ./bin/codepaint --style idiomatic < input.js > output.js

Or a file containing a JSON string:

> ./bin/codepaint --stylefile < style.json > < input.js > output.js

Or have it use the file's EditorConfig settings:

> ./bin/codepaint < input.js > output.js

Supported style properties
--------------------------

1.  EditorConfig properties: **indent\_style**, **indent\_size**, **trim\_trailing\_whitespace** and
    **insert\_final\_newline**. Refer to EditorConfig's [documentation](http://editorconfig.org/) for more information.

1.  **quote\_type**: *single*, *double*, *auto*

    Specifies what kind of quoting you would like to use for string literals:

    `console.log("Hello world!")` -> `console.log('Hello world!')`

    Adds proper escaping when necessary, obviously.

    `console.log('Foo "Bar" Baz')` -> `console.log("Foo \"Bar\" Baz")`

    The *auto* setting infers the quoting with a precedence toward *single* mode.

    `console.log("Foo \"Bar\" Baz")` -> `console.log('Foo "Bar" Baz')` or
    `console.log('Foo \'Bar\' Baz')` -> `console.log("Foo 'Bar' Baz")`

1.  **space\_after\_control\_statements**: *true*, *false*

    Specifies whether or not there should be a space between if/for/while and the following (.

    `if(x === 4)` -> `if (x === 4)` or `while (foo()) {` -> `while(foo()) {`

1.  **space\_after\_anonymous\_functions**: *true*, *false*

    Specifies whether or not there should be a space between function and () in anonymous functions.

    `function(x) { }` -> `function (x) { }`

1.  **spaces\_around\_operators**: *true*, *false*, *hybrid*

    Specifies whether or not there should be spaces around operators such as `+,=,+=,>=,!==`.

    `var x = 4;` -> `var x=4;` or `a>=b` -> `a >= b` or `a>>2` -> `a >> 2`

    *Hybrid* mode is mostly like the *true* setting, except it behaves as *false* on operators `*,/,%`
    and unary operators `!,~,+,-`, not to be confused with the `+` and `-` addition and subtraction operators.

    `var x = 4 * 2 + 1 / 7;` -> `var x = 4*2 + 1/7;`

1.  **spaces\_in\_brackets**: *true*, *false*, *hybrid*

    Specifies whether or not there should be spaces inside brackets, which includes `(),[],{}`.
    Empty pairs of brackets will always be shortened.

    `(x===4)` -> `( x===4 )` or `( )` -> `()`

    The *hybrid* setting mostly reflects Idiomatic style. Refer to
    [Idiomatic Style Manifesto](https://github.com/rwldrn/idiomatic.js/#whitespace).
