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

let sendCommand = function(command) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(command));
    }
  })
}

app.use(serveStatic('public', { 'index': false }))
app.use(bodyParser.json())
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

app.set('view engine', 'pug')

app.post('/', function(req, res) {
  console.log(req.body);
  req.body.inputs.map(function(input) {
    switch (input.intent) {
      case "action.devices.SYNC":
        Node.where("name", "!=", "null").fetchAll().then((results) => {
          devices = results.models.map(function(node) {
            return {
              "id": node.get("id"),
              "type": "action.devices.types.LIGHT",
              "traits": [ "action.devices.traits.OnOff" ],
              "name": { "name": node.get("name") },
              "willReportState": false,
            }
          });
          res.send({
            "requestId": req.body.requestId,
            "payload": { "devices": devices }
          })
        })
        break
      case "action.devices.EXECUTE":
        let commands = input.payload.commands.map(function(command) {
          let devices = command.devices.map(function(device) {
            command.execution.map(function(execution) {
              if (execution.command == "action.devices.commands.OnOff") {
                sendCommand({
                  "id" : device.id,
                  "command" : execution.params.on ? "on" : "off"
                })
              }
            })
            return device.id
          })
          return {
            "devices" : devices,
            "status" : "SUCCESS"
          }
        })
        res.send({
          "requestId": req.body.requestId,
          "payload": { "commands": commands }
        })
    }
  })
})

app.get('/', function(req, res) {
  console.log(req.body)
  Node.fetchAll().then((results) => {
    console.log(results.toJSON())
    res.render('index', { "nodes" : results.toJSON() })
  })
})

app.post('/command', function(req, res) {
  console.log("POST: /command")
  sendCommand(req.body)
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
})

wss.on('connection', function connection(ws, req) {
  ws.on('message', function incoming(message) {
    console.log('Received: %s', message);
    j = JSON.parse(message)
    if (j.command == "register") {
      Node.forge({id: j.mac}).upsert().then(function(n) {
        console.log(n);
      })
    }
  })
})

server.listen(4236, () => console.log('Example app listening on port 4236!'))
