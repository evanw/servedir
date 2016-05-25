# servedir

`servedir` is a simple [Node](http://nodejs.org) web server for offline development and testing: running `servedir` from a directory will create a quick local web server. `servedir` is useful for developing scripts that require a standard web environment and can't use the `file://` protocol.

The annotated source code is included in the `docs/` folder.

## Installation

Check out a working copy of the source code with [Git](http://git-scm.com), or install `servedir` via [npm](http://npmjs.org). The latter will also install `servedir` into the system's `bin` path.

    $ git clone git@github.com:evanw/servedir.git
    $ npm install secure-servedir -g

Alternatively, `servedir` can be run directly from the repository using Node:

    $ node bin/servedir
    $ ./bin/servedir

## Usage

`servedir [path] [port] [--external]`

* `path` - The location to serve files and directories from. Defaults to the current working directory.
* `port` - The port number. Default to 8000.
* `--external` - If specified, this flag exposes the server to the rest of the network. The server only binds to the internal loopback interface by default.

### Example

    $ servedir ~/Documents/example 8001
    $ servedir ~/Documents/example
    $ servedir ~/Documents/example --external
    $ servedir 8001
    $ servedir

## Contributors

* [Remy Sharp](http://remysharp.com/) (author)
* [Graham Ballantyne](http://grahamballantyne.com/)
* [Kit Cambridge](http://kitcambridge.github.com/)
* [Mathias Bynens](http://mathiasbynens.be/)
* [Evan Wallace](http://madebyevan.com/)
