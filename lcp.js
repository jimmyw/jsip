function LCP() {
  this.fsm = new FSM();
}

LCP.CI = {
  MRU          :1,  /* Maximum Receive Unit */
  ASYNCMAP     :2,  /* Async Control Character Map */
  AUTHTYPE     :3,  /* Authentication Type */
  QUALITY      :4,  /* Quality Protocol */
  MAGICNUMBER  :5,  /* Magic Number */
  PCOMPRESSION :7,  /* Protocol Field Compression */
  ACCOMPRESSION:8,  /* Address/Control Field Compression */
  CALLBACK     :13, /* callback */
  MRRU         :17, /* max reconstructed receive unit; multilink */
  SSNHF        :18, /* short sequence numbers for multilink */
  EPDISC       :19, /* endpoint discriminator */
};
LCP.LinkPhase = {
  DEAD: 0,
  INITIALIZE: 1,
  ESTABLISH: 2,
  AUTHENTICATE: 3,
  CALLBACK: 4,
  NETWORK: 5,
  TERMINATE: 6
};

// Prototypes
LCP.prototype.protocol_id = 0xc021;
LCP.prototype.name = "LCP";
LCP.prototype.phase = LCP.LinkPhase.DEAD;
LCP.prototype.wantoptions = {};
LCP.prototype.init = function(ppp) {
  console.log("LCP: init");
  this.ppp = ppp;
  this.fsm.init(ppp, this);
}
LCP.prototype.input = function(data) {
  //printBytes("LCP", data);
  
  this.fsm.input(data);
}
LCP.prototype.reqci = function(data, reject_if_disagree) {
  printBytes("LCP: reqci ", data);
  var i = 0;
  while(i < data.length) {
    var citype = data[i];
    var cilen = data[i+1];
    var cidata = data.subarray(i + 2, i + cilen);
    //console.log("LCP: citype: ", citype, "cilen", cilen);
    switch(citype) {
      case LCP.CI.MRU:
      case LCP.CI.ASYNCMAP:
        printBytes("LCP: ASYNCMAP", cidata);
        break;
      case LCP.CI.AUTHTYPE:
      case LCP.CI.QUALITY:
      case LCP.CI.MAGICNUMBER:
        printBytes("LCP: MAGICNUMBER", cidata);
        break;
      case LCP.CI.PCOMPRESSION:
        printBytes("LCP: PCOMPRESSION");
        break;
      case LCP.CI.ACCOMPRESSION:
        printBytes("LCP: ACOMPRESSION");
        break;
      case LCP.CI.CALLBACK:
      case LCP.CI.MRRU:
      case LCP.CI.SSNHF:
      case LCP.CI.EPDISC:
    }
    i += cilen;
  }
  return FSM.Codes.CONFACK;
}
LCP.prototype.start = function() {
  console.log("LCP: lowerup");
  this.fsm.lowerup();
  this.open();
}

LCP.prototype.open = function()
{
  var wo = this.wantoptions;
  this.flags = 0;
  if (wo.passive) {
    this.flags |= LCP.OPT_PASSIVE;
  }
  if (wo.silent) {
    this.flags |= LCP.OPT_SILENT;
  }
  this.fsm.open();
  this.phase = LCP.LinkPhase.ESTABLISH;
}

