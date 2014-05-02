var PPP_ALLSTATIONS=0xff;
var PPP_UI=0x03;
var PPP_FLAG=0x7e;
var PPP_ESCAPE=0x7d;
var PPP_TRANS=0x20;

function decode(buffer) {
  var decoded = new Uint8Array(buffer.length);
  j = 0;
  for (i=0; i < buffer.length; i++) {
    if (buffer[i] == PPP_ESCAPE) {
      i++;
      decoded[j++] = buffer[i] ^ PPP_TRANS;
    } else {
      decoded[j++] = buffer[i];
    }
  }
  return decoded.subarray(0, j);
};


function PPP() {};
PPP.DevStates = {
  PDIDLE: 0,      /* Idle state - waiting. */
  PDSTART: 1,     /* Process start flag. */
  PDADDRESS: 2,   /* Process address field. */
  PDCONTROL: 3,   /* Process control field. */
  PDPROTOCOL1: 4, /* Process protocol field 1. */
  PDPROTOCOL2: 5, /* Process protocol field 2. */
  PDDATA:6        /* Process data byte. */
};
PPP.prototype.protocols = {};
PPP.prototype.parse_ppp = function(buffer) {
  console.log("Got package len: ", buffer.length);

  var decoded = decode(buffer);
  var state = PPP.DevStates.PDIDLE;
  var protocol = 0;

  printBytes("decoded", decoded);

  var data = new Uint8Array(decoded.length);
  var j = 0;
  for (i=0; i < decoded.length; i++) {
    var curChar = decoded[i];
    console.log("byte: ", curChar.toString(16), " state:", byId(PPP.DevStates, state));
    switch(state) {
      case PPP.DevStates.PDIDLE:
        if (curChar != PPP_ALLSTATIONS) {
          break;
        }

      case PPP.DevStates.PDSTART:
      case PPP.DevStates.PDADDRESS:
        if (curChar == PPP_ALLSTATIONS) {
          state = PPP.DevStates.PDCONTROL;
          break;
        }
      case PPP.DevStates.PDCONTROL:
        if (curChar == PPP_UI) {
          state = PPP.DevStates.PDPROTOCOL1;
          break;
        }
      case PPP.DevStates.PDPROTOCOL1:
          if (curChar & 1) {
            protocol = curChar;
            state = PPP.DevStates.PDDATA;
          } else {
            protocol = curChar << 8;
            state = PPP.DevStates.PDPROTOCOL2;
          }
          break;
      case PPP.DevStates.PDPROTOCOL2:
          protocol |= curChar;
          state = PPP.DevStates.PDDATA;
          break;
      case PPP.DevStates.PDDATA:
          data[j++] = curChar;
          break;
    }
  }

  this.proto = this.protocols[protocol];
  this.proto.input(data.subarray(0, j));
}
PPP.prototype.registerProtocol = function(proto) {
  this.protocols[proto.protocol_id] = new proto(this);
}

