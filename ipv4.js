
function IPV4() {};
IPV4.prototype.protocol_id = 0x04;
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
      var packet_data = data.subarray(20);
      switch(data[9]) {
        case 0x01: /* ICMP */
          console.log("ICMP TYPE", packet_data[0]);
          console.log("ICMP CODE", packet_data[1]);
          console.log("ICMP CHKSUM", (packet_data[2] << 8) | packet_data[3]);
          switch(packet_data[0]) {
            case 0x08: /* PING */
              console.log("PING ID", (packet_data[4] << 8) | packet_data[5]);
              console.log("PING SEQ", (packet_data[6] << 8) | packet_data[7]);
              break;
          }
          break;
        case 0x06: /* TCP */
          break;
        case 0x11: /* UDP */
          console.log("UDP SRC PORT", (packet_data[0] << 8) | packet_data[1]);
          console.log("UDP DST PORT", (packet_data[2] << 8) | packet_data[3]);
          console.log("UDP LEN", (packet_data[4] << 8) | packet_data[5]);
          console.log("UDP CHKSUM", (packet_data[6] << 8) | packet_data[7]);
          var data = packet_data.subarray(8);
          document.write("<pre>" + String.fromCharCode.apply(null, data) + "</pre>");
          break;
      }
  }

