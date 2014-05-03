
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
PPP.ACCMMask = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80];

/* Prototypes */
PPP.prototype.protocols = {};
PPP.prototype.init = function() {
  console.log("PPP: init");

  // Default on serial connections. (modem escape code stuff)
  this.inACCM[15] = 0x60;
  for (var p in this.protocols) {
    this.protocols[p].init(this);
  }
}

PPP.prototype.inACCM = new Uint8Array(32);
PPP.prototype.escaped = function(c) { return this.inACCM[c >> 3] & PPP.ACCMMask[c & 0x07]};
PPP.prototype.inEscaped = false;
PPP.prototype.state = PPP.DevStates.PDIDLE;
PPP.prototype.protocol = 0;
PPP.prototype.data = new Uint8Array(1500);
PPP.prototype.data_pos = 0;
PPP.prototype.parse_ppp = function(buffer) {
  
  console.log("PPP: Got package len: ", buffer.length);

  for (var i=0; i < buffer.length; i++) {
    var curChar = buffer[i];
    var escaped = this.escaped(curChar);
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
        /*} else if (pcrx->inFCS != PPP_GOODFCS) {
          console.log("Bad package");*/
        } else {
          // Trim ending 2 bytes (checksum)
          //console.log("protocol: ", this.protocol, " data: " + this.data.subarray(0, this.data_pos-2));
          if(this.protocol in this.protocols) {
            this.proto = this.protocols[this.protocol];
            this.proto.input(this.data.subarray(0, this.data_pos-2));
          } else {
            console.log("Unknown protocol ", this.protocol);
          }
          this.data_pos = 0;
        }
        this.state = PPP.DevStates.PDADDRESS;
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
          //this.inFCS = PPP.FCS.INITFCS;

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
    }
  }

}
PPP.prototype.send = function(data) {
  console.log("PPP: send is not implemented");
}
PPP.prototype.registerProtocol = function(proto) {
  this.protocols[proto.protocol_id] = new proto(this);
}

