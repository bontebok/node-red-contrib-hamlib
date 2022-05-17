module.exports = function(RED) {
  'use strict';
  const hamlib = require("./lib/hamlib.js");
  let radios = {};

  function hamlibConfig(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.host = n.host || "localhost";
    this.port = n.port || 4532;

    radios[node.id] = new hamlib(n.port, n.host);
    radios[node.id].on("error", (err) =>{ // Need to handle errors
      node.log(err);
    });

    node.on("close", function() {
      for (let radio in radios) {
        radio.disconnect();
      }
    });
  }

  function hamlibSet(n) {
    RED.nodes.createNode(this, n);
    this.server = RED.nodes.getNode(n.server);
    var node = this;
    this.radio = radios[n.server];
    node.status({ fill: 'red', shape: 'dot', text: 'disconnected' });

    node.on("input", (msg) => {
      let event = ((n.event == "msg.event") ? msg.event : n.event)
      this.radio.set(event, (...v) => {
        RED.util.setMessageProperty(msg, "event", n.event, true);
        RED.util.setMessageProperty(msg, "payload", ((v.length < 2) ? v[0] : v), true);
        node.send(msg);
      },msg.payload)
    });

    this.radio.on("connection", () => {
      node.status({ fill: 'green', shape: 'dot', text: 'connected' });
    });

    this.radio.on("disconnect", () => {
      node.status({ fill: 'red', shape: 'dot', text: 'disconnected' });
    });
  }

  function hamlibGet(n) {
    RED.nodes.createNode(this, n);
    this.server = RED.nodes.getNode(n.server);
    var node = this;
    this.radio = radios[n.server];
    node.status({ fill: 'red', shape: 'dot', text: 'disconnected' });

    node.on("input", (msg) => {
      let event = ((n.event == "msg.event") ? msg.event : n.event)
      this.radio.get(event, (...v) => {
        RED.util.setMessageProperty(msg, "event", event, true);
        RED.util.setMessageProperty(msg, "payload", ((v.length < 2) ? v[0] : v), true);
        node.send(msg);
      })
    });

    this.radio.on("connection", () => {
      node.status({ fill: 'green', shape: 'dot', text: 'connected' });
    });

    this.radio.on("disconnect", () => {
      node.status({ fill: 'red', shape: 'dot', text: 'disconnected' });
    });

  }

  function hamlibListen(n) {
    RED.nodes.createNode(this, n);
    this.server = RED.nodes.getNode(n.server);
    var node = this;
    this.radio = radios[n.server];
    node.status({ fill: 'red', shape: 'dot', text: 'disconnected' });

    this.radio.on(n.event, (...v) => {
      let msg={};
      RED.util.setMessageProperty(msg, "event", n.event, true);
      RED.util.setMessageProperty(msg, "payload", ((v.length < 2) ? v[0] : v), true);
      node.send(msg);
    })

    this.radio.on("connection", () => {
      node.status({ fill: 'green', shape: 'dot', text: 'connected' });
    });

    this.radio.on("disconnect", () => {
      node.status({ fill: 'red', shape: 'dot', text: 'disconnected' });
    });
  }

  RED.nodes.registerType("hamlib-config", hamlibConfig);
  RED.nodes.registerType("hamlib-set", hamlibSet);
  RED.nodes.registerType("hamlib-get", hamlibGet);
  RED.nodes.registerType("hamlib-listen", hamlibListen);
}
