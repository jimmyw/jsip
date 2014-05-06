
// Extend buffer object, with possibility to push bytes that may be escaped.
Buffer.prototype.pushEscaped = function(b, accm) {
  if (accm && PPP.Escaped(b, accm)) {
    this.pushByte(PPP.Pack.ESCAPE);
    this.pushByte(b ^ PPP.Pack.TRANS);
  } else {
    this.pushByte(b);
  }
}

function PPP() {};

/* Statics */
PPP.Pack = {
  ALLSTATIONS: 0xff,
  UI: 0x03,
  FLAG: 0x7e,
  ESCAPE: 0x7d,
  TRANS: 0x20
};
PPP.MRU = 1500;
PPP.HDRLEN = 4;
PPP.DevStates = {
  PDIDLE: 0,      /* Idle state - waiting. */
  PDSTART: 1,     /* Process start flag. */
  PDADDRESS: 2,   /* Process address field. */
  PDCONTROL: 3,   /* Process control field. */
  PDPROTOCOL1: 4, /* Process protocol field 1. */
  PDPROTOCOL2: 5, /* Process protocol field 2. */
  PDDATA:6        /* Process data byte. */
};
PPP.Packet = {
  IP:          0x21,   /* Internet Protocol */
  AT:          0x29,   /* AppleTalk Protocol */
  VJC_COMP:    0x2d,   /* VJ compressed TCP */
  VJC_UNCOMP:  0x2f,   /* VJ uncompressed TCP */
  COMP:        0xfd,   /* compressed packet */
  IPCP:        0x8021, /* IP Control Protocol */
  ATCP:        0x8029, /* AppleTalk Control Protocol */
  CCP:         0x80fd, /* Compression Control Protocol */
  LCP:         0xc021, /* Link Control Protocol */
  PAP:         0xc023, /* Password Authentication Protocol */
  LQR:         0xc025, /* Link Quality Report protocol */
  CHAP:        0xc223, /* Cryptographic Handshake Auth. Protocol */
  CBCP:        0xc029  /* Callback Control Protocol */
};
PPP.ACCMMask = new Uint8Array([0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80]);
PPP.Escaped = function(c, accm) {return accm[c >> 3] & PPP.ACCMMask[c & 0x07]};
PPP.FCS = function(fcs, c) {return (fcs >> 8) ^ PPP.fcstab[(fcs ^ c) & 0xff]};
PPP.INITFCS = 0xffff;
PPP.GOODFCS = 0xf0b8;

/* Prototypes */
PPP.prototype.protocols = {};
PPP.prototype.init = function() {
  console.log("PPP: init");

  // Default always escapae 0x7e, 0x7d
  this.inACCM[15] = 0x60;
  this.outACCM[15] = 0x60;

  // Before LCP is set up, escape all ascii control bytes (0x00 - 0x1f)
  this.outACCM[0] = 0xff;
  this.outACCM[1] = 0xff;
  this.outACCM[2] = 0xff;
  this.outACCM[3] = 0xff;
  for (var p in this.protocols) {
    if(this.protocols[p].init)
      this.protocols[p].init(this);
  }
}

PPP.prototype.inACCM = new Uint8Array(32);
PPP.prototype.outACCM = new Uint8Array(32);
PPP.prototype.inEscaped = false;
PPP.prototype.state = PPP.DevStates.PDIDLE;
PPP.prototype.protocol = 0;
PPP.prototype.data = new Uint8Array(1500);
PPP.prototype.data_pos = 0;
PPP.prototype.inFCS = PPP.INITFCS;
PPP.prototype.delegate = function(protocol, data) {
  switch (protocol) {
    case PPP.Packet.IP:
      this.on_data(data);
      return true;
    default:
      if(protocol in this.protocols) {
        this.proto = this.protocols[protocol];
        if(this.proto.input) {
          this.proto.input(data);
          return true;
        }
      }
  }
  return false;
}
PPP.prototype.recv = function(buffer) {

  for (var i=0; i < buffer.length; i++) {
    var curChar = buffer[i];
    var escaped = PPP.Escaped(curChar, this.inACCM);
    //console.log("byte: ", curChar.toString(16), " state:", byId(PPP.DevStates, this.state), " escaped: ", escaped, "in_escaped: ", this.inEscaped);
    if (escaped) {
      if (curChar == PPP.Pack.ESCAPE) {
          this.inEscaped = true;
      } else if (curChar == PPP.Pack.FLAG) {
        if (this.state <= PPP.DevStates.PDADDRESS) {
          /* ignore it */;
        } else if (this.state < PPP.DevStates.PDDATA) {
          console.log("Incomplete Package");
        /* If the fcs is invalid, drop the packet. */
        } else if (this.inFCS != PPP.GOODFCS) {
          console.log("Bad package, FCS missmatch");
        } else {
          // Trim ending 2 bytes (checksum)
          if(!this.delegate(this.protocol, this.data.subarray(0, this.data_pos-2))) {
            this.sprotrej(this.protocol);
            console.log("Unknown protocol ", this.protocol.toString(16));
          }
          this.data_pos = 0;
        }
        this.state = PPP.DevStates.PDADDRESS;
        this.inFCS = PPP.INITFCS;
        this.inEscaped = false;
      } else {
        console.log("Drop char", curChar);
      }
    } else {
      if (this.inEscaped) {
        this.inEscaped = false;
        curChar ^= PPP.Pack.TRANS;
      }
      switch(this.state) {
        case PPP.DevStates.PDIDLE:
          if (curChar != PPP.Pack.ALLSTATIONS) {
            break;
          }

        /* Fall through */
        case PPP.DevStates.PDSTART:
          this.inFCS = PPP.INITFCS;

        /* Fall through */
        case PPP.DevStates.PDADDRESS:
          if (curChar == PPP.Pack.ALLSTATIONS) {
            this.state = PPP.DevStates.PDCONTROL;
            break;
          }
        /* Fall through */
        case PPP.DevStates.PDCONTROL:
          if (curChar == PPP.Pack.UI) {
            this.state = PPP.DevStates.PDPROTOCOL1;
            break;
          }
        /* Fall through */
        case PPP.DevStates.PDPROTOCOL1:
            if (curChar & 1) {
              this.protocol = curChar;
              this.state = PPP.DevStates.PDDATA;
            } else {
              this.protocol = curChar << 8;
              this.state = PPP.DevStates.PDPROTOCOL2;
            }
            break;
        case PPP.DevStates.PDPROTOCOL2:
            this.protocol |= curChar;
            this.state = PPP.DevStates.PDDATA;
            break;
        case PPP.DevStates.PDDATA:
            this.data[this.data_pos++] = curChar;
            break;
      }
      this.inFCS = PPP.FCS(this.inFCS, curChar);
    }
  }
}
PPP.prototype.sprotrej = function(protocol){
  var data = new Uint8Array(2);
  data[0] = protocol >> 8;
  data[1] = protocol & 0xff;
  for (var p in this.protocols) {
    if(this.protocols[p].sprotrej)
      this.protocols[p].sprotrej(data);
  }
}

PPP.prototype.send = function(data) {
  var buf = new Buffer();
  var fcsOut = PPP.INITFCS;
  buf.pushEscaped(PPP.Pack.FLAG, null);

  for (var i = 0; i < data.length; i++) {
    buf.pushEscaped(data[i], this.outACCM);
    fcsOut = PPP.FCS(fcsOut, data[i]);
  }

  buf.pushEscaped(~fcsOut & 0xFF, this.outACCM);
  buf.pushEscaped((~fcsOut >> 8) & 0xFF, this.outACCM);
  buf.pushEscaped(PPP.Pack.FLAG, null);

  this.send_cb(buf.get());
}

PPP.prototype.registerProtocol = function(proto) {
  var inst = new proto(this);
  this.protocols[inst.protocol_id] = inst;
}

PPP.prototype.start = function() {
  console.log("PPP: start");
  for (var p in this.protocols) {
    if(this.protocols[p].start)
      this.protocols[p].start();
  }
}
PPP.prototype.stop = function() {
  console.log("PPP: stop");
  for (var p in this.protocols) {
    if(this.protocols[p].stop)
      this.protocols[p].stop();
  }
}



/* Big table used for checksums */
PPP.fcstab = new Uint16Array([
  0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf,
  0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7,
  0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e,
  0x9cc9, 0x8d40, 0xbfdb, 0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876,
  0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd,
  0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5,
  0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c,
  0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974,
  0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb,
  0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3,
  0x5285, 0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a,
  0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72,
  0x6306, 0x728f, 0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9,
  0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1,
  0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738,
  0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862, 0x9af9, 0x8b70,
  0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7,
  0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff,
  0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036,
  0x18c1, 0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e,
  0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5,
  0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd,
  0xb58b, 0xa402, 0x9699, 0x8710, 0xf3af, 0xe226, 0xd0bd, 0xc134,
  0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c,
  0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1, 0xa33a, 0xb2b3,
  0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb,
  0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232,
  0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a,
  0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1,
  0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9,
  0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330,
  0x7bc7, 0x6a4e, 0x58d5, 0x495c, 0x3de3, 0x2c6a, 0x1ef1, 0x0f78
]);

