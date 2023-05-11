/*
 *
 * Node Discover
 *
 * Attributes
 *   Nodes
 *
 * Methods
 *   Promote
 *   Demote
 *   Join
 *   Leave
 *   Advertise
 *   Send
 *   Start
 *   Stop
 *   EachNode(fn)
 *
 * Events
 *   Promotion
 *   Demotion
 *   Added
 *   Removed
 *   Master
 *
 *
 * checkInterval should be greater than hello interval or you're just wasting cpu
 * nodeTimeout must be greater than checkInterval
 * masterTimeout must be greater than nodeTimeout
 *
 */

var Network = require("./network.js"),
  EventEmitter = require("events").EventEmitter,
  util = require("util");

var reservedEvents = [
  "promotion",
  "demotion",
  "added",
  "removed",
  "master",
  "hello",
];

/**
 * Callback for when the Discover instance has started up.
 *
 * @callback readyCallback
 * @param {Object} [error] - if an error occured during setup, then this will be an error object with information about the error
 * @param {boolean} success - whether or not everything is good to go
 */

/**
 * Create an instance of a node-discover
 *
 * @param {Object} options
 * @param {number} [options.helloInterval=1000] - How often to broadcast a hello packet in milliseconds
 * @param {number} [options.checkInterval=2000] - How often to to check for missing nodes in milliseconds
 * @param {number} [options.nodeTimeout=2000] - Consider a node dead if not seen in this many milliseconds
 * @param {number} [options.masterTimeout=2000] - Consider a master node dead if not seen in this many milliseconds
 * @param {string} [options.address='0.0.0.0'] - Address to bind to
 * @param {number} [options.port=12345] - Port on which to bind and communicate with other node-discover processes
 * @param {string} [options.broadcast='255.255.255.255'] - Broadcast address if using broadcast
 * @param {string} [options.multicast] - Multicast address if using multicast. If net set, broadcast or unicast is used.
 * @param {number} [options.mulitcastTTL=1] - Multicast TTL for when using multicast
 * @param {string|string[]} [options.unicast] - Comma separated String or String Array of Unicast addresses of known nodes
 *        It is advised to specify the address of the local interface when using unicast and expecting local discovery to work
 * @param {string} [options.key] - Encryption key if your broadcast packets should be encrypted
 * @param {number} [options.mastersRequired] - The count of master processes that should always be available
 * @param {number} [options.weight=Discover.weight()] - A number used to determine the preference for a specific process to become master. Higher numbers win.
 * @param {boolean} [options.client=false] - When true operate in client only mode (don't broadcast existence of node, just listen and discover)
 * @param {boolean} [options.reuseAddr=true] - Allow multiple processes on the same host to bind to the same address and port.
 * @param {string} [options.ignoreProcess=true] - If set to false, will not ignore messages from other Discover instances within the same process (on non-reserved channels), join() will receive them.
 * @param {boolean} [options.ignoreInstance=true] - If set to false, will not ignore messages from self (on non-reserved channels), join() will receive them.
 * @param {*} [options.advertisement] - The initial advertisement which is sent with each hello packet.
 * @param {string} [options.hostname=os.hostname()] - Override the OS hostname with a custom value.
 *        may also use use DISCOVERY_HOSTNAME environment variable
 *
 * @param {Function} [readyCallback] - a function which is called when discovery services have started
 * @returns
 */
class Discover {
  constructor(options, callback) {
    if (!(this instanceof Discover)) {
      return new Discover(options, callback);
    }

    EventEmitter.call(this);

    if (typeof options === "function") {
      callback = options;
      options = null;
    }

    var self = this,
      checkId,
      helloId,
      running = false,
      options = options || {};
    this.sync = null;

    var settings = (self.settings = {
      helloInterval: options.helloInterval || 500,
      helloIntervalMaster: options.helloInterval || 500,
      checkInterval: options.checkInterval || 500,
      nodeTimeout: options.nodeTimeout || 1600,
      masterTimeout: options.masterTimeout || options.nodeTimeout || 1600,
      address: options.address || "0.0.0.0",
      port: options.port || 59549,
      broadcast: options.broadcast || null,
      multicast: options.multicast || null,
      multicastTTL: options.multicastTTL || null,
      unicast: options.unicast || null,
      key: options.key || null,
      mastersRequired: options.mastersRequired || 1,
      weight: options.weight || Discover.weight(),
      reuseAddr: options.reuseAddr,
      exclusive: options.exclusive || false,

      start: options.start === false ? false : true,
      hostname: options.hostname || options.hostName || null,
    });
    self.broadcast = new Network({
      address: settings.address,
      port: settings.port,
      broadcast: settings.broadcast,
      multicast: settings.multicast,
      multicastTTL: settings.multicastTTL,
      unicast: settings.unicast,
      key: settings.key,
      exclusive: settings.exclusive,
      reuseAddr: settings.reuseAddr,
      ignoreProcess: false,
      ignoreInstance: settings.ignoreInstance,
      hostname: settings.hostname,
    });

    //This is the object that gets broadcast with each hello packet.
    self.me = {
      isMaster: false,
      weight: settings.weight,
      id: this.broadcast.instanceUuid,
    };

    self.nodes = {};
    self.channels = [];

    this.canHello = true;

    /*
     * When receiving hello messages we need things to happen in the following order:
     * 	- make sure the node is in the node list
     * 	- if hello is from new node, emit added
     * 	- if hello is from new master and we are master, demote
     * 	- if hello is from new master emit master
     *
     * need to be careful not to over-write the old node object before we have information
     * about the old instance to determine if node was previously a master.
     */
    this.evaluateHello = function (data, obj, rinfo) {
      //prevent processing hello message from self
      if (data.id === this.broadcast.instanceUuid) {
        return;
      }
      data.lastSeen = +new Date();
      data.address = rinfo.address;
      data.hostName = obj.hostName;
      data.port = rinfo.port;
      var isNew = !Boolean(this.nodes[obj.iid]);
      const wasMaster = this.nodes[obj.iid]
        ? this.nodes[obj.iid].isMaster
        : false;

      if (isNew) {
        this.emit("added", data, obj, rinfo);
        this.hello();
      }

      if (data.isMaster && (isNew || !wasMaster)) {
        //if we have this node and it was not previously a master then it is a new master node
        //this is a new master
        this.emit("master", data, obj, rinfo);
      }

      this.emit("helloReceived", data, obj, rinfo, isNew, wasMaster);
      this.nodes[obj.iid] = data;
    };

    this.broadcast.on("hello", (data, obj, rinfo) =>
      this.evaluateHello(data, obj, rinfo)
    );

    self.broadcast.on("error", function (error) {
      self.emit("error", error);
    });

    self.check = () => {
      const settings = self.settings;
      var node;
      for (var processUuid in self.nodes) {
        node = self.nodes[processUuid];

        if (
          Date.now() - node.lastSeen >
          (node.isMaster ? settings.masterTimeout : settings.nodeTimeout)
        ) {
          //we haven't seen the node recently
          //delete the node from our nodes list
          delete self.nodes[processUuid];
          self.emit("removed", node);
          self.hello();
        }
      }
      var mastersFound = 0,
        higherWeightMasters = 0,
        higherWeightFound = false;
      const me = self.me;
      for (var processUuid in self.nodes) {
        if (!self.nodes.hasOwnProperty(processUuid)) {
          continue;
        }
        var node = self.nodes[processUuid];

        if (
          node.isMaster &&
          Date.now() - node.lastSeen < settings.masterTimeout
        ) {
          mastersFound++;
          if (node.weight > me.weight) {
            higherWeightMasters += 1;
          }
        }

        if (node.weight > me.weight && !node.isMaster) {
          higherWeightFound = true;
        }
      }

      var iAmMaster = me.isMaster;
      if (iAmMaster && higherWeightMasters >= settings.mastersRequired) {
        self.demote();
      }

      if (
        !iAmMaster &&
        mastersFound < settings.mastersRequired &&
        !higherWeightFound &&
        me.weight > -1
      ) {
        //no masters found out of all our nodes, become one.
        self.promote();
      }
      self.emit("check");
    };

    self.start = function (callback) {
      if (running) {
        callback && callback(null, false);

        return false;
      }

      self.broadcast.start(function (err) {
        if (err) {
          return callback && callback(err, false);
        }

        running = true;

        if (self.me.weight > -1) {
          //send hello every helloInterval
          self.helloId = setInterval(function () {
            self.hello();
          }, settings.helloInterval);
        }
        self.hello();
        self.emit("started", self);
        checkId = setInterval(self.check, settings.checkInterval);

        return callback && callback(null, true);
      });
    };

    self.stop = function () {
      if (!running) {
        return false;
      }

      self.broadcast.stop();

      clearInterval(checkId);
      clearInterval(self.helloId);

      self.emit("stopped", self);

      running = false;
    };

    //check if auto start is enabled
    if (self.settings.start) {
      self.start(callback);
    }
  }
  static weight() {
    //default to negative, decimal now value
    return -(Date.now() / Math.pow(10, String(Date.now()).length));
  }
  promote() {
    this.canHello = false;
    clearInterval(this.helloId);
    this.helloId = setInterval(() => {
      this.hello();
    }, this.settings.helloIntervalMaster);
    this.me.isMaster = true;
    this.emit("promotion", this.me);
  }
  demote(permanent) {
    clearInterval(this.helloId);
    this.helloId = setInterval(() => {
      this.hello();
    }, this.settings.helloInterval);
    this.me.isMaster = false;
    this.emit("demotion", this.me);
    this.hello();
  }
  master(node) {
    var self = this;

    self.emit("master", node);
  }
  hello() {
    if (!this.canHello) {
      console.error("this can't hello");
      return;
    }
    var self = this;

    self.broadcast.send("hello", self.me);
    self.emit("helloEmitted");
  }
  advertise(obj) {
    var self = this;

    self.me.advertisement = obj;
  }
  eachNode(fn) {
    var self = this;

    for (var uuid in self.nodes) {
      fn(self.nodes[uuid]);
    }
  }
  join(channel, fn) {
    var self = this;

    if (~reservedEvents.indexOf(channel)) {
      return false;
    }

    if (~self.channels.indexOf(channel)) {
      return false;
    }

    if (fn) {
      self.on(channel, fn);
    }

    self.broadcast.on(channel, function (data, obj, rinfo) {
      self.emit(channel, data, obj, rinfo);
    });

    self.channels.push(channel);

    return true;
  }
  leave(channel) {
    var self = this;

    self.broadcast.removeAllListeners(channel);

    delete self.channels[self.channels.indexOf(channel)];

    return true;
  }
  send(channel, obj) {
    var self = this;

    if (~reservedEvents.indexOf(channel)) {
      return false;
    }

    self.broadcast.send(channel, obj);

    return true;
  }
}

util.inherits(Discover, EventEmitter);
module.exports = Discover;
