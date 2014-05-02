function PPPFsm() {};
PPPFsm.LinkStates = {
  LS_INITIAL : 0, /* Down, hasn't been opened */
  LS_STARTING: 1, /* Down, been opened */
  LS_CLOSED  : 2, /* Up, hasn't been opened */
  LS_STOPPED : 3, /* Open, waiting for down event */
  LS_CLOSING : 4, /* Terminating the connection, not open */
  LS_STOPPING: 5, /* Terminating, but open */
  LS_REQSENT : 6, /* We've sent a Config Request */
  LS_ACKRCVD : 7, /* We've received a Config Ack */
  LS_ACKSENT : 8, /* We've sent a Config Ack */
  LS_OPENED  : 9, /* Connection available */
};
PPPFsm.Codes = {
  CONFREQ: 1, /* Configuration Request */
  CONFACK: 2, /* Configuration Ack */
  CONFNAK: 3, /* Configuration Nak */
  CONFREJ: 4, /* Configuration Reject */
  TERMREQ: 5, /* Termination Request */
  TERMACK: 6, /* Termination Ack */
  CODEREJ: 7, /* Code Reject */
};
PPPFsm.prototype.state = PPPFsm.LinkStates.LS_INITIAL;
PPPFsm.prototype.proto = {};
PPPFsm.prototype.ConfRequest = function(id, fsm_data) {
  console.log("state: " + byId(PPPFsm.LinkStates, this.state));
  switch(this.state) {
    case PPPFsm.LinkStates.LS_CLOSED:
      /* Go away, we're closed */
      //fsm_sdata(f, TERMACK, id, NULL, 0);
      return;
    case PPPFsm.LinkStates.LS_CLOSING:
    case PPPFsm.LinkStates.LS_STOPPING:
      return;

    case PPPFsm.LinkStates.LS_OPENED:
      /* Go down and restart negotiation */
      if(this.proto.down) {
        this.proto.down(this);  /* Inform upper layers */
      }
      //fsm_sconfreq(f, 0);    /* Send initial Configure-Request */
      break;

    case PPPFsm.LinkStates.LS_STOPPED:
      /* Negotiation started by our peer */
      //fsm_sconfreq(f, 0);    /* Send initial Configure-Request */
      this.state = PPPFsm.LinkStates.LS_REQSENT;
      break;
  }

}
PPPFsm.prototype.handlePackage = function(protocol, data) {

  // Parse 4 byte header
  var code = data[0];
  var id = data[1];
  var len = ((data[2] << 8) | data[3]) - 4;
  var fsm_data = data.subarray(4, 4 + len);

  console.log("Code: " + code);
  console.log("id: ", id);
  console.log("len: ", len);
  printBytes("package", data);
  printBytes("package data", data.subarray(4, 4 + len));

  this.proto = PPPProtocols[protocol];
  console.log("Protocol name:", this.proto.name); 

  switch (code) {
    case PPPFsmCodes.CONFREQ:
      this.ConfRequest(id, fsm_data);
      break;
  }
}

