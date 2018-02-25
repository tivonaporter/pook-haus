const knex = require('knex')(require("./knexfile.js"))
const _ = require('underscore')
const pug = require('pug')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const favicon = require('serve-favicon')
const bookshelf = require('bookshelf')(knex)
const upsert = require("./upsert.js")
const path = require('path')
const http = require('http')
const serveStatic = require('serve-static')
const WebSocket = require('ws')
const server = http.createServer(app)
const wss = new WebSocket.Server({server})
const url = require('url')

bookshelf.plugin(upsert)

const Node = bookshelf.Model.extend({
  tableName: 'nodes'
})

const Basestation = bookshelf.Model.extend({
  tableName: 'basestations',
  nodes: function() { return this.hasMany(Node) }
})

app.use(serveStatic('public', { 'index': false }))
app.use(bodyParser.json())
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

app.set('view engine', 'pug')

app.get('/', (req, res) =>
  Basestation.fetchAll({withRelated: ['nodes']}).then((results) => {
    console.log(results.toJSON())
    res.render('index', { basestations: results.toJSON() })
  })
)

app.post('/command', function(req, res) {
  console.log("POST: /command")
  console.log(req.body)
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(req.body));
    }
  })
  res.sendStatus(200)
})

app.post('/sync', function(req, res) {
  console.log("POST: /sync")
  console.log(req.body)
  b = Basestation.forge({id: req.body.id})
  b.upsert().then(function() {
    Promise.all(req.body.network.map(function(d) {
      Node.forge({id: d}).upsert({basestation_id: b.id})
    }));
  }).then(() => res.sendStatus(200))
});

wss.on('connection', function connection(ws, req) {
  const location = url.parse(req.url, true);
  ws.on('message', function incoming(message) {
    console.log('Received: %s', message);
  });
});

server.listen(4236, () => console.log('Example app listening on port 4236!'))
