# Code Painter

[![Build Status](https://secure.travis-ci.org/jedhunsaker/codepainter.png?branch=master)](http://travis-ci.org/jedhunsaker/codepainter)

Code Painter is a JavaScript beautifier that instead of asking you to manually specify the desired formatting style,
can infer it from a code sample provided by you. This could, for instance, be a code snippet from the same project
that your new code is supposed to be integrated with.

It uses the excellent [Esprima parser](http://esprima.org/) by [Ariya Hidayat](http://ariya.ofilabs.com/) (thanks!).

It also uses [EditorConfig](http://editorconfig.org/) to define coding style.

The name is inspired by Word's Format Painter, which does a similar job for rich text.

## Installation

    $ npm install codepainter

To access the command globally, do a global install:

    $ npm install -g codepainter

*nix users might also have to add the following to their .bashrc file:

    PATH=$PATH:/usr/local/share/npm/bin

## Usage

You can see the usage in the CLI directly by typing `codepaint` or `codepaint --help`.

```
  Usage: codepaint [options] "<glob>" ["<glob>"...]
  Alias: codepainter

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -i, --infer <path>          code sample to infer
    -p, --predef <name>         specify predefined style (idiomatic|...)
    -j, --json <path>           JSON file with style settings
    -s, --style <key>=<value>   an individual style setting
    -e, --editor-config <path>  path to EditorConfig core binary
    -C, --no-color              disable color escape codes

  Examples:

    $ codepaint "**/*.js"
    $ codepaint "**/*view.js" "**/*model.js"
    $ codepaint -i sample.js "**/*.js"
    $ codepaint -p idiomatic "**/*.js"
    $ codepaint -j custom.json "**/*.js"
    $ codepaint -s quote_type=null "**/*.js"
    $ codepaint -s indent_style=space -s indent_size=4 "**/*.js"
    $ codepaint -e /usr/local/bin/editorconfig "**/*.js"
```

## Examples

    $ codepaint "**/*.js"

This doesn't transform any files, but it does show you how many files would be affected by the glob you've provided.
Globs absolutely *must* be in quotes or you will experience unexpected behavior!

    $ codepaint -i infer.js "**/*.js"

Transforms all .js files under the current directory with the style inferred from infer.js

    $ codepaint -p idiomatic "**/*.js"

Transforms all .js files under the current directory with a Code Painter pre-defined style. In this case, Idiomatic.
The only other pre-defined styles available at this time are mediawiki and hautelook.

    $ codepaint -j custom.json "**/*.js"

Transforms all .js files under the current directory with a custom style in JSON format.

    $ codepaint -s indent_style=space -s indent_size=4 "**/*.js"

Transforms all .js files under the current directory with 2 settings: `indent_style=space` and `indent_size=4`. You
can specify as many settings as you want and you can set values to `null` to disable them.

    $ codepaint -e /usr/local/bin/editorconfig "**/*.js"

Transforms all .js files under the current directory with the EditorConfig settings defined for each individual file.

Refer to [EditorConfig Core Installation](https://github.com/editorconfig/editorconfig-core#installation)
for installation instructions and [EditorConfig](http://editorconfig.org/) for more information, including how to
define and use `.editorconfig` files.

    $ codepaint -i infer.js -p idiomatic -j custom.json -s end_of_line=null -e /usr/local/bin/editorconfig "**/*.js"

As you can see, you can use as many options as you want. Code Painter will cascade your styles and report how the
cascade has been performed, like so:

```
  Inferred style:
   + indent_style = tab
   + insert_final_newline = true
   + quote_type = auto
   + space_after_anonymous_functions = false
   + space_after_control_statements = false
   + spaces_around_operators = false
   + trim_trailing_whitespace = false
   + spaces_in_brackets = false

  hautelook style:
   * indent_style = space
   + indent_size = 4
   * trim_trailing_whitespace = true
   + end_of_line = lf
   = insert_final_newline = true
   = quote_type = auto
   * spaces_around_operators = true
   = space_after_control_statements = false
   = space_after_anonymous_functions = false
   * spaces_in_brackets = hybrid

  Supplied JSON file:
   * space_after_control_statements = true
   = indent_style = space
   * indent_size = 3

  Inline styles:
   x end_of_line = null

  Editor Config:
   + applied on a file-by-file basis

  Transforming files...

  REPORT: 27 files transformed
```

## Supported Style Properties

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

## License

Released under the MIT license.

