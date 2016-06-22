'use strict';

var reposDir = 'repos';

const fs = require('fs');
const fsp = require('fs-promise');
const less = require('less');
const https = require('https');
const app = require('express')();

var repos;

fsp.readdir(reposDir)
.then(listing => repos = listing.filter(d => d != '.keep'))
.catch(err => console.log(err));

// server on port 8000
let options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
};
https.createServer(options, app).listen(8000);
console.log('port 8000: HTTPS'); 

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
});

// serve repository list
app.get('/repos.json', (req, res) => {
  console.log('serving: repos.json');
  res.json({repos})
});

// serve assets
app.get(/\.(css|less|js|ttf|woff)$/, (req, res) => {
  getFilename(req.url)
  .then(filename => {
    console.log('serving: ' + filename);

    // compile .less to .css (if requested that way)
    if (/\.css$/.test(req.url) && /\.less$/.test(filename)) {
      res.setHeader('content-type', 'text/css');

      fsp.readFile(filename, {encoding:'utf8'})
      .then(out => {
        return less.render(out, {paths: [reposDir], filename: filename})
      })
      .then(out => res.send(out.css))
      .catch(err => res.status(500).send('help!'));
    }
    else if (filename)
      res.sendFile(__dirname + '/' + filename);
    else
      res.status(404).send('404: ' + filename);
  })
  .catch(err => res.status(404).send('404: ' + req.url));
});


// WebSocket sends update when files change
var wsPort = 8080;
var wsServer = new require('ws').Server({
  port: wsPort,
  cert: fs.readFileSync('./cert.pem'),
  key: fs.readFileSync('./key.pem'),
});

wsServer.on('connection', function connection(ws) {
  let sock = ws._socket;
  console.log('connect', sock.remoteAddress + ':' + sock.remotePort); 
});
console.log('port 8080: WebSocket');

var chokidar = require('chokidar');
// ignores .dotfiles and libraries
var watcher = chokidar.watch(reposDir,{
  ignored: [ /[\/\\]\./, /.*node_modules.*/],
});

watcher.on('all', (event, path) => {
  if (event == 'add')
    console.log('watching: ', path.match(RegExp(reposDir + '/(.*)'))[1]);
  else if (event == 'change' && /\.(css|less)$/.test(path)) {
    console.log('update: ', getUrl(path));
    wsServer.clients.forEach(function each(client) {
      client.send(JSON.stringify({path: getUrl(path)}));
    });
  }
});

function getFilename(url) {
  return new Promise(function(resolve, reject) {
    let basename = reposDir + url.match(/(.*)\..*/)[1];

    let recurse = exts => {
      return fsp.stat(basename + exts[0])
      .then(s => resolve(basename + exts[0]))
      .catch(e => exts.length > 1 ? recurse(exts.slice(1)) : reject(e))
      .catch(e => console.log(e));
    };

    if (/\.js$/.test(url))
      recurse('.js .dev.js /index.dev.js /index.js'.split(' '));
    else if (/\.css$/.test(url))
      recurse('.less .css /index.less /index.css'.split(' '));
    else
      return fsp.stat(reposDir + url).then(s => resolve(reposDir + url))
  });
}

function getUrl(filename) {
  return filename;
  // let re = new RegExp('repos/(.*)/index.less');
  // return filename.match(re)[1] + '.css';
}

