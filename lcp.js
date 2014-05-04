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

LCP.prototype.protocol_id = 0xc021;
LCP.prototype.name = "LCP";
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
    console.log("LCP: citype: ", citype, "cilen", cilen);
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
        printBytes("LCP: PCOMPRESSION", cidata);
        break;
      case LCP.CI.ACCOMPRESSION:
        printBytes("LCP: ACOMPRESSION", cidata);
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

