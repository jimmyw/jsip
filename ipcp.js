
function IPCP() {
  this.fsm = new FSM();
}
IPCP.CI = {
  ADDRS: 1,        /* IP Addresses */
  COMPRESSTYPE: 2, /* Compression Type */
  ADDR: 3,
  MS_DNS1: 129,    /* Primary DNS value */
  MS_WINS1: 128,   /* Primary WINS value */
  MS_DNS2: 131,    /* Secondary DNS value */
  MS_WINS2: 130    /* Secondary WINS value */
};
IPCP.ADDR_LEN = 4; /* SIZE of a ipv4 addr */
IPCP.prototype.protocol_id = 0x8021;
IPCP.prototype.name = "IPCP";
IPCP.prototype.local_addr = new Uint8Array([0x0, 0x0, 0x0, 0x0]); // 0.0.0.0
IPCP.prototype.remote_addr = new Uint8Array([0x0, 0x0, 0x0, 0x0]); // 0.0.0.0
IPCP.prototype.init = function(ppp) {
  console.log("IPCP: init");
  this.ppp = ppp;
  this.fsm.init(ppp, this);
}
IPCP.prototype.input = function(data) {
  this.fsm.input(data);
}
IPCP.prototype.lowerup = function() {
  console.log("IPCP: lowerup");
  this.fsm.lowerup();
}
IPCP.prototype.open = function() {
  console.log("IPCP: open");
  this.fsm.open();
}

IPCP.prototype.addci = function(data) {
  var data = new Uint8Array(6);
  data[0] = IPCP.CI.ADDR;
  data[1] = IPCP.ADDR_LEN + 2;
  data[2] = this.local_addr[0];
  data[3] = this.local_addr[1];
  data[4] = this.local_addr[2];
  data[5] = this.local_addr[3]; 
  return data;
}
IPCP.prototype.rejci = function(data) {
  printBytes("IPCP: rejci ", data);
  var i = 0;
  while(i < data.length) {
    var citype = data[i];
    var cilen = data[i+1];
    var cidata = data.subarray(i + 2, i + cilen);
    console.log("LCP REJ: citype: ", byId(IPCP.CI, citype), "cilen", cilen);
    i += cilen;
  }
  return true;
}
IPCP.prototype.nakci = function(data) {
  printBytes("IPCP: nakci ", data);
  var i = 0;
  while(i < data.length) {
    var citype = data[i];
    var cilen = data[i+1];
    var cidata = data.subarray(i + 2, i + cilen);
    console.log("LCP NAK: citype: ", byId(IPCP.CI, citype), "cilen", cilen);
    switch(citype) {
      case IPCP.CI.ADDR:
        console.log("Got NAK ip-adress: ", cidata[0], ".", cidata[1], ".", cidata[2], ".", cidata[3]);
        this.local_addr[0] = cidata[0];
        this.local_addr[1] = cidata[1];
        this.local_addr[2] = cidata[2];
        this.local_addr[3] = cidata[3];
        break;
    }
    i += cilen;
  }
  return true;
}
IPCP.prototype.reqci = function(data, reject_if_disagree) {
  printBytes("IPCP: reqci ", data);
  var i = 0;
  while(i < data.length) {
    var citype = data[i];
    var cilen = data[i+1];
    var cidata = data.subarray(i + 2, i + cilen);
    console.log("LCP: citype: ", byId(IPCP.CI, citype), "cilen", cilen);
    switch(citype) {
      case IPCP.CI.ADDRS: /* IP Addresses */
        break;
      case IPCP.CI.COMPRESSTYPE: /* Compression Type */
        break;
      case IPCP.CI.ADDR:
        console.log("Got ip-adress: ", cidata[0], ".", cidata[1], ".", cidata[2], ".", cidata[3]);
        this.remote_addr[0] = cidata[0];
        this.remote_addr[1] = cidata[1];
        this.remote_addr[2] = cidata[2];
        this.remote_addr[3] = cidata[3];
        break;
    }
    i += cilen;
  }
  return FSM.Codes.CONFACK;
}

