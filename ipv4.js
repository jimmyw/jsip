
function IPV4() {};
IPV4.DEFAULT_TTL = 255;
IPV4.HLEN = 20;
IPV4.htons = function(n) { return ((n & 0xff) << 8) | ((n & 0xff00) >> 8); };
IPV4.ntohs = function(n) { return ((n & 0xff) << 8) | ((n & 0xff00) >> 8); };
IPV4.ntohl = function(n) {
  return ((n & 0xff) << 24) |
    ((n & 0xff00) << 8) |
    ((n & 0xff0000) >> 8) |
    ((n & 0xff000000) >> 24);
};
IPV4.htonl = function(n) {
  return ((n & 0xff) << 24) |
    ((n & 0xff00) << 8) |
    ((n & 0xff0000) >> 8) |
    ((n & 0xff000000) >> 24);
};
IPV4.chksum = function(data) {
  var acc = 0;
  var i;
  for (i=0; i < data.length; i+=2) {
    acc += data[i] << 8 | data[i+1];
  }
  if (i < data.length) {
    acc += data[i] << 8;
  }

  /* add deferred carry bits */
  acc = (acc >> 16) + (acc & 0x0000ffff);
  if ((acc & 0xffff0000) != 0) {
    acc = (acc >> 16) + (acc & 0x0000ffff);
  }
  return IPV4.ntohs(acc);
}

IPV4.prototype.protocol_id = 0x04;
IPV4.prototype.protocols = {};
IPV4.prototype.registerProtocol = function(proto) {
  var inst = new proto();
  this.protocols[inst.protocol_id] = inst;
};
IPV4.prototype.init = function(ip) {
  this.registerProtocol(ICMP);
  this.registerProtocol(UDP);
  for (var p in this.protocols) {
    if (this.protocols[p].init)
      this.protocols[p].init(ip, this);
  }
};
IPV4.prototype.on_data = function(data) {
  console.log("IP Header Len", data[0] & 0x1111);
  console.log("IP TOS", data[1]);
  console.log("IP LEN", (data[2] << 8) | data[3]);
  console.log("IP FRAGMENT ID", (data[4] << 8) | data[5]);
  console.log("IP TTL", data[8]);
  console.log("IP PROTOCOL", data[9]);
  console.log("IP CHECKSUM", (data[10] << 8) | data[11]);
  console.log("IP SRC", data[12], ".", data[13], ".", data[14], ".", data[15]);
  console.log("IP DST", data[16], ".", data[17], ".", data[18], ".", data[19]);
  var protocol = data[9];
  if (protocol in this.protocols) 
    this.protocols[protocol].on_data(data); 
};

