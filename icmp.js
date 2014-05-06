function ICMP() {};
ICMP.prototype.protocol_id = 0x01;
ICMP.PROTO = {
  ER:   0,   /* echo reply */
  DUR:  3,   /* destination unreachable */
  SQ:   4,   /* source quench */
  RD:   5,   /* redirect */
  ECHO: 8,   /* echo */
  TE:  11,   /* time exceeded */
  PP:  12,   /* parameter problem */
  TS:  13,   /* timestamp */
  TSR: 14,   /* timestamp reply */
  IRQ: 15,   /* information request */
  IR:  16    /* information reply */
};
ICMP.prototype.init = function(ip, ipv4) {
  this.ip = ip;
};
ICMP.prototype.dump = function(data) {
  var packet_data = data.subarray(20);
  console.log("ICMP TYPE", packet_data[0]);
  console.log("ICMP CODE", packet_data[1]);
  console.log("ICMP CHKSUM", (packet_data[2] << 8) | packet_data[3]);
  switch(packet_data[0]) {
    case ICMP.PROTO.ER: /* PING REPLY */
      console.log("ER ID", (packet_data[4] << 8) | packet_data[5]);
      console.log("ER SEQ", (packet_data[6] << 8) | packet_data[7]);
      console.log("ER DATA", String.fromCharCode.apply(null,packet_data.subarray(8)));
      break;
    case ICMP.PROTO.ECHO: /* PING REQUEST */
      console.log("ECHO ID", (packet_data[4] << 8) | packet_data[5]);
      console.log("ECHO SEQ", (packet_data[6] << 8) | packet_data[7]);
      console.log("ECHO DATA", String.fromCharCode.apply(null,packet_data.subarray(8)));
      break;
  }
}
ICMP.prototype.on_data = function(data) {
  switch(data[20]) {
    case ICMP.PROTO.ECHO: /* PING */
      var reply = new Uint8Array(data);
      byteSwap(reply, 12, reply, 16, 4); // switch places in ipaddr
      reply[8] = IPV4.DEFAULT_TTL; // Reset TTL
      reply[10] = 0;
      reply[11] = 0;
      reply[20] = ICMP.PROTO.ER; // Change to a echo reply
      // Recalculate imcp checksum
      var isum = data[22] << 8 & data[23];
      if (isum >= IPV4.htons(0xffff - (ICMP.PROTO.ECHO << 8))) {
        isum += IPV4.htons(ICMP.PROTO.ECHO << 8) + 1;
      } else {
        isum += IPV4.htons(ICMP.PROTO.ECHO << 8);
      }
      reply[22] = isum >> 8;
      reply[23] = isum & 0xff;
      var chksum = IPV4.chksum(reply.subarray(0, IPV4.HLEN));
      reply[10] = chksum >> 8;
      reply[11] = chksum & 0xff;
      this.ip.ip_output(reply);
      break;
  }
};

