function IP() {};
IP.prototype.devices = [];
IP.prototype.protocols = {};
IP.prototype.dump = function(data) {
  console.log("IP PACKET DATA len:", data.length);
  console.log("IP Version", data[0] >> 4);
  if ((data[0] >> 4) in this.protocols) 
    this.protocols[data[0] >> 4].dump(data); 
}
IP.prototype.on_data = function(data) {
  this.dump(data);
  var ip_protocol = data[0] >> 4;
  if (ip_protocol in this.protocols) 
    this.protocols[data[0] >> 4].on_data(data); 
};
IP.prototype.init = function() {
  this.registerProtocol(IPV4);
  for (var p in this.protocols) {
    this.protocols[p].init(this);
  }
};
IP.prototype.registerProtocol = function(proto) {
  var inst = new proto();
  this.protocols[inst.protocol_id] = inst;
};
IP.prototype.on_up = function(ip_addr) {

};
IP.prototype.on_down = function(ip_addr) {

};
IP.prototype.ip_output = function(data) {
  //this.dump(data);
  for (var d in this.devices) {
    this.devices[d].ip_output(data);
  }
}
IP.prototype.registerDevice = function(dev) {
  this.devices.push(dev);
  dev.on_up   = this.on_up.bind(this); 
  dev.on_down = this.on_down.bind(this);
  dev.on_data = this.on_data.bind(this);
}
