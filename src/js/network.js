var dgram = require("dgram");
var crypto = require("crypto");
var os = require("os");
var EventEmitter = require("events").EventEmitter;
var util = require("util");
var uuid = require("uuid").v4;

var procUuid = uuid();
var hostName = process.env.DISCOVERY_HOSTNAME || os.hostname();

/**
 *
 *
 * @param {*} options
 * @returns
 */
class Network {
  constructor(options) {
    if (!(this instanceof Network)) {
      return new Network(options, callback);
    }

    EventEmitter.call(this);

    var self = this;
    var options = options || {};

    self.address = options.address || "0.0.0.0";
    self.port = options.port || 12345;
    self.broadcast = options.broadcast || null;
    self.multicast = options.multicast || null;
    self.multicastTTL = options.multicastTTL || 1;
    self.unicast = options.unicast || null;
    self.key = options.key || null;
    self.exclusive = options.exclusive || false;
    self.reuseAddr = options.reuseAddr === false ? false : true;
    self.ignoreProcess = options.ignoreProcess === false ? false : true;
    self.ignoreInstance = options.ignoreInstance === false ? false : true;
    self.hostName = options.hostname || options.hostName || hostName;

    self.instanceUuid = uuid();
    self.processUuid = procUuid;
    self.socket = dgram.createSocket({
      type: "udp4",
      reuseAddr: self.reuseAddr,
    });

    self.socket.on("message", function (data, rinfo) {
      self.decode(data, function (err, obj) {
        if (obj.event && obj.data) {
          self.emit(obj.event, obj.data, obj, rinfo);
        } else {
          self.emit("message", obj);
        }
      });
    });

    self.socket.on("error", (err) => {
      self.socket.close();
      console.log("Network error: " + err.stack);
    });
  }
  /**
   *
   *
   * @param {*} callback
   */
  start(callback) {
    var self = this;

    var bindOpts = {
      port: self.port,
      address: self.address,
      exclusive: self.exclusive,
    };

    self.socket.bind(bindOpts, function () {
      if (self.unicast) {
        if (typeof self.unicast === "string" && ~self.unicast.indexOf(",")) {
          self.unicast = self.unicast.split(",");
        }

        self.destination = [].concat(self.unicast);
      } else if (self.multicast) {
        try {
          //addMembership can throw if there are no interfaces available
          self.socket.addMembership(self.multicast);
          self.socket.setMulticastTTL(self.multicastTTL);
        } catch (e) {
          self.emit("error", e);

          return callback && callback(e);
        }

        self.destination = [self.multicast];
      } else {
        //Default to using broadcast if multicast address is not specified.
        self.socket.setBroadcast(true);

        //TODO: get the default broadcast address from os.networkInterfaces() (not currently returned)
        self.destination = [self.broadcast || "255.255.255.255"];
      }

      //make sure each destination is a Destination instance
      self.destination.forEach(function (destination, i) {
        self.destination[i] = Destination(destination);
      });

      return callback && callback();
    });
  }
  /**
   *
   *
   * @param {*} callback
   * @returns
   */
  stop(callback) {
    var self = this;

    self.socket.close();

    return callback && callback();
  }
  /**
   *
   *
   * @param {*} event
   */
  send(event) {
    var self = this;

    var obj = {
      event: event,
      pid: procUuid,
      iid: self.instanceUuid,
      hostName: self.hostName,
    };

    if (arguments.length == 2) {
      obj.data = arguments[1];
    } else {
      //TODO: splice the arguments array and remove the first element
      //setting data to the result array
    }

    self.encode(obj, function (err, contents) {
      if (err) {
        return false;
      }

      var msg = Buffer.from(contents);

      self.destination.forEach(function (destination) {
        self.socket.send(
          msg,
          0,
          msg.length,
          destination.port || self.port,
          destination.address
        );
      });
    });
  }
  /**
   *
   *
   * @param {*} data
   * @param {*} callback
   * @returns
   */
  encode(data, callback) {
    const self = this;
    let tmp;

    try {
      tmp = self.key
        ? encrypt(JSON.stringify(data), self.key)
        : JSON.stringify(data);
    } catch (e) {
      return callback(e, null);
    }

    return callback(null, tmp);
  }
  /**
   *
   *
   * @param {*} data
   * @param {*} callback
   * @returns
   */
  decode(data, callback) {
    var self = this,
      tmp;

    try {
      if (self.key) {
        tmp = JSON.parse(decrypt(data.toString(), self.key));
      } else {
        tmp = JSON.parse(data);
      }
    } catch (e) {
      return callback(e, null);
    }

    return callback(null, tmp);
  }
}

util.inherits(Network, EventEmitter);

/**
 *
 *
 * @param {*} str
 * @param {*} key
 * @returns
 */
function encrypt(str, key) {
  var buf = [];
  var cipher = crypto.createCipher("aes256", key);

  buf.push(cipher.update(str, "utf8", "binary"));
  buf.push(cipher.final("binary"));

  return buf.join("");
}

/**
 *
 *
 * @param {*} str
 * @param {*} key
 * @returns
 */
function decrypt(str, key) {
  var buf = [];
  var decipher = crypto.createDecipher("aes256", key);

  buf.push(decipher.update(str, "binary", "utf8"));
  buf.push(decipher.final("utf8"));

  return buf.join("");
}

/**
 *
 *
 * @param {*} address
 * @param {*} port
 * @returns
 */
function Destination(address, port) {
  if (!(this instanceof Destination)) {
    return new Destination(address, port);
  }

  if (!port && ~address.indexOf(":")) {
    var tokens = address.split(":");
    address = tokens[0];
    port = tokens[1];
  }

  this.address = address;
  this.port = port;
}

module.exports = Network;
