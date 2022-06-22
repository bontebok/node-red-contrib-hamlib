'use strict';
const net = require('net');
const EventEmitter = require('events');

const rigctl = {
  frequency: {
    get: {rigcmd: () => 'f\n', results: 1},
    set: {rigcmd: (freq) => `F ${freq}\n`, results: 1}
  },
  mode: {
    get: {rigcmd: (parms) => 'm\n', results: 2},
    set: {rigcmd: (mode,bandwidth=0) => `M ${mode} ${bandwidth}\n`, results: 1}
  },
  ptt: {
    get: {rigcmd: () => 't\n', results: 1},
    set: {rigcmd: (ptt=0) => `T ${ptt}\n`, results: 1}
  },
  tuningstep: {
    get: {rigcmd: () => 'n\n', results: 1},
    set: {rigcmd: (hz) => `N ${hz}\n`, results: 1}
  },
  // Radio Functions, pass true or false to enable or disable
  noiseblanker: {
    get: {rigcmd: () => 'u NB\n', results: 1},
    set: {rigcmd: (bool) => `U NB ${bool}\n`, results: 1}
  },
  automaticnotchfilter: {
    get: {rigcmd: () => 'u ANF\n', results: 1},
    set: {rigcmd: (bool) => `U ANF ${bool}\n`, results: 1}
  },
  manualnotchfilter: {
    get: {rigcmd: () => 'u MN\n', results: 1},
    set: {rigcmd: (bool) => `U MN ${bool}\n`, results: 1}
  },
  noisereduction: {
    get: {rigcmd: () => 'u NR\n', results: 1},
    set: {rigcmd: (bool) => `U NR ${bool}\n`, results: 1}
  },
  audiopeakfilter: {
    get: {rigcmd: () => 'u APF\n', results: 1},
    set: {rigcmd: (bool) => `U APF ${bool}\n`, results: 1}
  },
  monitor: {
    get: {rigcmd: () => 'u MON\n', results: 1},
    set: {rigcmd: (bool) => `U MON ${bool}\n`, results: 1}
  },
  manualgaincontrol: {
    get: {rigcmd: () => 'u \n', results: 1},
    set: {rigcmd: (bool) => `U MAGC ${bool}\n`, results: 1}
  },
  fastautomaticgaincontrol: {
    get: {rigcmd: () => 'u FAGC\n', results: 1},
    set: {rigcmd: (bool) => `U FAGC ${bool}\n`, results: 1}
  },
  lock: {
    get: {rigcmd: () => 'u LOCK\n', results: 1},
    set: {rigcmd: (bool) => `U LOCK ${bool}\n`, results: 1}
  },
  autofrequencycontrol: {
    get: {rigcmd: () => 'u AFC\n', results: 1},
    set: {rigcmd: (bool) => `U AFC ${bool}\n`, results: 1}
  },
  tuner: {
    get: {rigcmd: () => 'u TUNER\n', results: 1},
    set: {rigcmd: (bool) => `U TUNER ${bool}\n`, results: 1}
  },
  // Levels, pass in a value between 0.00 and 1.00 as a floating point number
  preamp: {
    get: {rigcmd: () => 'l PREAMP\n', results: 1},
    set: {rigcmd: (level) => `L PREAMP ${level}\n`, results: 1}
  },
  afgain: {
    get: {rigcmd: () => 'l AF\n', results: 1},
    set: {rigcmd: (level) => `L AF ${level}\n`, results: 1}
  },
  rfgain: {
    get: {rigcmd: () => 'l RF\n', results: 1},
    set: {rigcmd: (level) => `L RF ${level}\n`, results: 1}
  },
  rfpowermeter: {
    get: {rigcmd: () => 'l RFPOWER_METER\n', results: 1},
    set: {rigcmd: (level) => `L RFPOWER_METER ${level}\n`, results: 1}
  },
  rfpowermeterwatts: {
    get: {rigcmd: () => 'l RFPOWER_METER_WATTS\n', results: 1},
    set: {rigcmd: (level) => `L RFPOWER_METER_WATTS ${level}\n`, results: 1}
  },
  micgain: {
    get: {rigcmd: () => 'l MICGAIN\n', results: 1},
    set: {rigcmd: (level) => `L MICGAIN ${level}\n`, results: 1}
  },
  notchfilter: {
    get: {rigcmd: () => 'l NOTCHF\n', results: 1},
    set: {rigcmd: (level) => `L NOTCHF ${level}\n`, results: 1}
  },
  compression: {
    get: {rigcmd: () => 'l COMP\n', results: 1},
    set: {rigcmd: (level) => `L COMP ${level}\n`, results: 1}
  },
  automaticgaincontrol: {
    get: {rigcmd: () => 'l AGC\n', results: 1},
    set: {rigcmd: (level) => `L AGC ${level}\n`, results: 1}
  },
  meter: {
    get: {rigcmd: () => 'l METER\n', results: 1},
    set: {rigcmd: (level) => `L METER ${level}\n`, results: 1}
  },
  swr: {
    get: {rigcmd: () => 'l SWR\n', results: 1},
    set: {rigcmd: (level) => `L SWR ${level}\n`, results: 1}
  },
  signalstrength: {
    get: {rigcmd: () => 'l STRENGTH\n', results: 1},
    set: {rigcmd: (level) => `L STRENGTH ${level}\n`, results: 1}
  },
  alc: {
    get: {rigcmd: () => 'l ALC\n', results: 1},
    set: {rigcmd: (level) => `L ALC ${level}\n`, results: 1}
  },
  // Special VFO setting for tuning
  tune: {
    set: {rigcmd: () => `G TUNE\n`, results: 1}
  },
  // Power status
  powerstat: {
    get: {rigcmd: () => '\x88\n', results: 1},
    set: {rigcmd: (opt) => `\x87 ${opt}\n`, results: 1}
  }
};

function convertToHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
}

class Queue { //General queue handler

  constructor() {
    this.first = 0;
    this.last = 0;
    this.storage = {};
  }

  enqueue(value) {
    this.storage[this.last] = value;
    this.last++;
  }

  dequeue() {
    if (this.last > this.first) {
      var value = this.storage[this.first];
      this.first++;
      return value;
    } else {
      return 0;
    }
  }

  get size() {
    return this.last - this.first;
  }
}

module.exports = class HamLib extends EventEmitter {

  connect() {
    if (this.client) {
      this.client.removeAllListeners('connect');
      this.client.connect(this.port, this.host, () => {
        this.connected = true;
        this.emit('connection');
      });
    }
  }

  reconnect() {

    // Connect if not connected
    if (this.client) {
      if (!this.connected) {
        this.connect(); // Make an attempt first
      }
      if (!this.connected &!this.reconnectTimer) { // Still not connected, set up a reconnect timer
        this.reconnectTimer = setInterval(() => {
          if(!this.connected) {
            this.connect();
          }
          else { // Connected, kill the timer
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        },500)
      }
    }
  }

  end() {
    this.client.end(() => {
      this.emit('disconnected');
    });
    this.connected = false;
    if(!this.reconnectTimer)
      this.reconnect();
  }

  destroy() {
    this.client.destroy((err) => {
      this.emit('error', err);
    });
    this.connected = false;
    delete this.client;
  }

  incoming (data) {
    if (data.startsWith("RPRT -")) {
      // An error has occurred!
      this.emit('error', data);
      this.data = "";
      this.waiting = false;
      if (this.queue.size >0) // More to process, keep going
        this.send();
    }
    else {
      let lines;
      this.data += data; // append what we have already for data
      this.parsed = this.data.split('\n'); // /\r\n|\r|\n/

      if ((this.parsed.length-1) == this.query.rigctl.results) {
        this.parsed = this.parsed.slice(0,-1); // Remove trailing value
        // We received the amount we need
        // Process results??
        this.process();
        this.data = "";
        this.waiting = false;
      }
      if (this.queue.size >0) // More to process
        this.send();
    }
  }

  process() {
    if (this.query.command in rigctl) {
      if (this.query.emit)
        this.emit(this.query.command,...this.parsed);
      if ("callback" in this.query)
        if (typeof(this.query.callback) === 'function')
          this.query.callback(...this.parsed);
    }
  }

  constructor(port, host) {
    super();
    this.queue = new Queue();
    this.client = new net.Socket();
    this.port = port;
    this.host = host;
    this.connected = false;
    this.reconnectTimer = null;
    this.waiting = false;
    this.query = {};
    this.data = "";

    this.client.setEncoding('ascii'); // utf8 results in a buffer, let's work with strings

    this.client.on('data', (data) => {
      this.incoming(data);
    });

    this.client.on('error', (err) => {
      // Pass errors on
      if (err) {
        this.emit('error',err);
      }
    });

    this.client.on('end', () => {
      this.connected = false;
      this.emit('disconnect');
      if(!this.reconnectTimer)
        this.reconnect();
    })

    this.client.on('close', (err) => {
      this.connected = false;
      this.emit('disconnect');
      if(!this.reconnectTimer)
        this.reconnect();
    });

    this.reconnect();
  }

  send() { // Process the queue
    if(!this.waiting) { // Don't run if we're still waiting on a reply
      this.waiting = true; // We're sending so block anyone else from calling
      this.query = this.queue.dequeue(); // Grab the next request from the queue
      this.client.write(this.query.rigctl.rigcmd(...this.query.parms));
    }
  }

  sendrequest(query) {
    this.queue.enqueue(query); // Add the query
    if (!this.waiting) { // nothing is waiting so initiate a send
      this.send();
    }
  }

  get(command, callback, ...parms) {
    const query = {};

    if (command in rigctl) {
      if ("get" in rigctl[command]) {
        query.emit = true;
        query.command = command;
        query.rigctl = rigctl[command].get;
        query.parms = parms;
        query.callback = callback;
        if(this.connected) this.sendrequest(query);
      }
    }
  }

  set(command, callback, ...parms) {
    const query = {};

    if (command in rigctl) {
      if ("set" in rigctl[command]) {
        query.command = command;
        query.rigctl = rigctl[command].set;
        query.parms = parms;
        //query.callback = callback;
        if(this.connected) {
          this.sendrequest(query);
          this.get(command, callback, parms); // Queue up a get request
        }
      }
    }
  }
}
