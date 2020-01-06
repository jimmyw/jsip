function TCP() {};
TCP.prototype.protocol_id = 0x6;
TCP.prototype.init = function(ip, iptv4) {

};
TCP.prototype.flags = {
  TCP_FIN: 0x01,
  TCP_SYN: 0x02,
  TCP_RST: 0x04,
  TCP_PSH: 0x08,
  TCP_ACK: 0x10,
  TCP_URG: 0x20,
  TCP_ECE: 0x40,
  TCP_CWR: 0x80
};
TCP.prototype.dump = function(data) {
  var packet_data = data.subarray(20);
  console.log("TCP SRC PORT", (packet_data[0] << 8) | packet_data[1]);
  console.log("TCP DST PORT", (packet_data[2] << 8) | packet_data[3]);
  console.log("TCP SEQ", (packet_data[4] << 14) | packet_data[5] << 16 | packet_data[6] << 8 | packet_data[7]);
  console.log("TCP ACK", (packet_data[8] << 14) | packet_data[9] << 16 | packet_data[10] << 8 | packet_data[11]);
  console.log("TCP OFFSET", packet_data[12] >> 4);
  console.log("TCP FLAG",
              packet_data[13] & this.flags.TCP_FIN ? "FIN" : "",
              packet_data[13] & this.flags.TCP_SYN ? "SYN" : "",
              packet_data[13] & this.flags.TCP_RST ? "RST" : "",
              packet_data[13] & this.flags.TCP_PSH ? "PSH" : "",
              packet_data[13] & this.flags.TCP_ACK ? "ACK" : "",
              packet_data[13] & this.flags.TCP_URG ? "URG" : "",
              packet_data[13] & this.flags.TCP_ECE ? "ECE" : "",
              packet_data[13] & this.flags.TCP_CWR ? "CWR" : ""
  );
  console.log("TCP WINDOW SIZE", (packet_data[14] << 8) | packet_data[15]);
  console.log("TCP CHKSUM", (packet_data[16] << 8) | packet_data[17]);
  console.log("TCP URG", (packet_data[18] << 8) | packet_data[19]);
}

TCP.prototype.on_data = function(data) {
  var data = data.subarray(28);
  document.write("<pre>" + String.fromCharCode.apply(null, data) + "</pre>");
}


