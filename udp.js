function UDP() {};
UDP.prototype.protocol_id = 0x11;
UDP.prototype.init = function(ip, iptv4) {

};
UDP.prototype.dump = function(data) {
  var packet_data = data.subarray(20);
  console.log("UDP SRC PORT", (packet_data[0] << 8) | packet_data[1]);
  console.log("UDP DST PORT", (packet_data[2] << 8) | packet_data[3]);
  console.log("UDP LEN", (packet_data[4] << 8) | packet_data[5]);
  console.log("UDP CHKSUM", (packet_data[6] << 8) | packet_data[7]);
}

UDP.prototype.on_data = function(data) {
  var data = data.subarray(28);
  document.write("<pre>" + String.fromCharCode.apply(null, data) + "</pre>");
}

