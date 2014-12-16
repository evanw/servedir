// servedir HTTP Server
// http://github.com/rem/servedir

// Copyright 2011, Remy Sharp
// http://remysharp.com

// Convenience aliases.
var createServer = require('http').createServer, parse = require('url').parse, path = require('path'), fs = require('fs'), types,

// Matches control characters in URLs.
escapable = /[\x00-\x1f\x7f"'&?$\x20+,:;=@<>#%{}|\\\^~\[\]`]/g,

// Escape sequences and entities for control characters.
escapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&apos;'
};

fs.exists || (fs.exists = path.exists);

// The `servedir` function creates a new simple HTTP server.
var servedir = module.exports = function(root, port, options) {
  if (typeof root != 'string') root = servedir.defaultRoot;
  if (typeof port != 'number') port = servedir.defaultPort;

  if (options === undefined) options = {};

  // Create a new HTTP server.
  var server = createServer(function(req, res) {
    // Resolve the path to the requested file or folder.

    var end = res.end,
        writeHead = res.writeHead,
        statusCode;

    // taken rather liberally from Connect's logger.
    if (!options.quiet) {
      // proxy for statusCode.
      res.writeHead = function(code, headers){
        res.writeHead = writeHead;
        res.writeHead(code, headers);
        res.__statusCode = statusCode = code;
        res.__headers = headers || {};
      };

      res.end = function(chunk, encoding) {
        res.end = end;
        res.end(chunk, encoding);

        console.log((req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress)))
           + ' [' + (new Date).toUTCString() + ']'
           + ' "' + req.method + ' ' + req.url
           + ' HTTP/' + req.httpVersionMajor + '.' + req.httpVersionMinor + '" '
           + (statusCode || res.statusCode)) + ' ' + (req.headers['user-agent'] || '-');
      };
    }

    var pathname = decodeURIComponent(parse(req.url).pathname), file = path.join(root, pathname);

    // Only allow writing over files if the server can only accept local connections
    if (req.method === 'POST' && !options.allowExternalAccess) {
      var origin = req.headers.origin && parse(req.headers.origin).hostname;
      if (origin !== 'localhost' && origin !== '127.0.0.1') {
        res.writeHead(403, {'Content-Type': 'text/plain'});
        res.end('Forbidden.');
      } else {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        var body = [];
        req.on('data', function(data) {
          body.push(data);
        });
        req.on('end', function() {
          fs.writeFile(file, Buffer.concat(body), function(err) {
            if (err) {
              res.writeHead(500, {'Content-Type': 'text/plain'});
              res.end('An internal server error occurred: ' + err);
            } else {
              res.writeHead(200, {'Content-Type': 'text/plain'});
              res.end('Post successful.');
            }
          });
        });
      }
    }

    else if (req.method === 'GET') {
      fs.exists(file, function(exists) {
        if (!exists) {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end('The file ' + file + ' was not found.');
        } else {
          // Serve files and directories.
          fs.stat(file, function(err, stats) {
            if (err) {
              // Internal server error; avoid throwing an exception.
              res.writeHead(500, {'Content-Type': 'text/plain'});
              res.end('An internal server error occurred: ' + err);
            }

            // File
            else if (stats.isFile()) {
              res.statusCode = 200;
              // Set the correct MIME type using the extension.
              var ext = path.extname(file).slice(1);
              res.setHeader('Content-Type', types[ext] || servedir.defaultType);
              try {
                var content = fs.readFileSync(file);
                var chunkTime = 1000; // Stream each file out over a second
                var chunkCount = 100; // The number of chunks to deliver the file in
                var chunkSize = Math.ceil(content.length / chunkCount);
                res.setHeader('Content-Length', content.length);
                function next() {
                  if (content.length > 0) {
                    res.write(content.slice(0, chunkSize));
                    content = content.slice(chunkSize);
                    setTimeout(next, chunkTime / chunkCount);
                  } else {
                    res.end();
                  }
                }
                if (options.emulateSlowConnection) {
                  next();
                } else {
                  res.end(content);
                }
              } catch (err) {
                // Internal server error; avoid throwing an exception.
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end('An internal server error occurred: ' + err);
              }
            }

            // Directory
            else {
              // Automatically append a trailing slash for directories.
              if (pathname.charAt(pathname.length - 1) != '/') pathname += '/';
              fs.readdir(file, function(err, files) {
                if (err) {
                  res.writeHead(500, {'Content-Type': 'text/plain'});
                  res.write('An internal server error occurred: ' + err);
                } else {
                  // Create a basic directory listing.
                  files = files.map(function(name) {
                    // URL-encode the path to each file or directory.
                    return '<a href="' + (pathname + name).replace(escapable, function(match) {
                      // Cache escape sequences not already in the escapes hash.
                      return escapes[match] || (escapes[match] = '%' + match.charCodeAt(0).toString(16));
                    }) + '">' + name + '</a>';
                  });
                  // Add a link to the root directory.
                  if (pathname != '/') files.unshift('<a href="..">..</a>');
                  res.writeHead(200, {'Content-Type': 'text/html'});
                  res.write('<!DOCTYPE html><meta charset=utf-8><title>[dir] ' + file + '</title><ul><li>' + files.join('<li>') + '</ul>');
                }
                res.end();
              });
            }
          });
        }
      });
    }

    else {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end('Unsupported method: ' + req.method);
    }
  });
  server.listen(port, options.allowExternalAccess ? null : 'localhost');
  return server;
};

// The current version of `servedir`. Keep in sync with `package.json`.
servedir.version = '0.1.10';

// The default MIME type, root directory, and port.
servedir.defaultType = 'application/octet-stream';
servedir.defaultRoot = '.';
servedir.defaultPort = 8000;

// Common MIME types.
servedir.types = types = {
  'aiff': 'audio/x-aiff',
  'appcache': 'text/cache-manifest',
  'atom': 'application/atom+xml',
  'bmp': 'image/bmp',
  'crx': 'application/x-chrome-extension',
  'css': 'text/css',
  'eot': 'application/vnd.ms-fontobject',
  'gif': 'image/gif',
  'htc': 'text/x-component',
  'html': 'text/html',
  'ico': 'image/vnd.microsoft.icon',
  'ics': 'text/calendar',
  'jpeg': 'image/jpeg',
  'js': 'text/javascript',
  'json': 'application/json',
  'mathml': 'application/mathml+xml',
  'midi': 'audio/midi',
  'mov': 'video/quicktime',
  'mp3': 'audio/mpeg',
  'mp4': 'video/mp4',
  'mpeg': 'video/mpeg',
  'ogg': 'video/ogg',
  'otf': 'font/opentype',
  'pdf': 'application/pdf',
  'png': 'image/png',
  'rtf': 'application/rtf',
  'sh': 'application/x-sh',
  'svg': 'image/svg+xml',
  'swf': 'application/x-shockwave-flash',
  'tar': 'application/x-tar',
  'tiff': 'image/tiff',
  'ttf': 'font/truetype',
  'txt': 'text/plain',
  'wav': 'audio/x-wav',
  'webm': 'video/webm',
  'webp': 'image/webp',
  'woff': 'font/woff',
  'xhtml': 'application/xhtml+xml',
  'xml': 'text/xml',
  'xsl': 'application/xml',
  'xslt': 'application/xslt+xml',
  'zip': 'application/zip'
};

// MIME type aliases for different extensions.
types.aif = types.aiff;
types.htm = types.html;
types.jpe = types.jpg = types.jpeg;
types.jsonp = types.js;
types.manifest = types.appcache;
types.markdown = types.markdn = types.mdown = types.mdml = types.md = types.txt;
types.mid = types.midi;
types.mpg = types.mpeg;
types.ogv = types.ogg;
types.rb = types.txt;
types.svgz = types.svg;
types.tif = types.tiff;
types.xht = types.xhtml;
types.php = types.html;
