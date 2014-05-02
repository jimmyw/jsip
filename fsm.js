function FSM() {};
FSM.LinkStates = {
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
FSM.Codes = {
  CONFREQ: 1, /* Configuration Request */
  CONFACK: 2, /* Configuration Ack */
  CONFNAK: 3, /* Configuration Nak */
  CONFREJ: 4, /* Configuration Reject */
  TERMREQ: 5, /* Termination Request */
  TERMACK: 6, /* Termination Ack */
  CODEREJ: 7, /* Code Reject */
};
FSM.prototype.state = FSM.LinkStates.LS_INITIAL;
FSM.prototype.init = function(ppp, proto) {
  self.ppp = ppp;
  self.proto = proto;
  console.log("Fsm init");
}
FSM.prototype.ConfRequest = function(id, fsm_data) {
  console.log("state: " + byId(FSM.LinkStates, this.state));
  switch(this.state) {
    case FSM.LinkStates.LS_CLOSED:
      /* Go away, we're closed */
      //fsm_sdata(f, TERMACK, id, NULL, 0);
      return;
    case FSM.LinkStates.LS_CLOSING:
    case FSM.LinkStates.LS_STOPPING:
      return;

    case FSM.LinkStates.LS_OPENED:
      /* Go down and restart negotiation */
      if(this.proto.down) {
        this.proto.down(this);  /* Inform upper layers */
      }
      //fsm_sconfreq(f, 0);    /* Send initial Configure-Request */
      break;

    case FSM.LinkStates.LS_STOPPED:
      /* Negotiation started by our peer */
      //fsm_sconfreq(f, 0);    /* Send initial Configure-Request */
      this.state = FSM.LinkStates.LS_REQSENT;
      break;
  }

}
FSM.prototype.input = function(data) {

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

  switch (code) {
    case FSM.Codes.CONFREQ:
      this.ConfRequest(id, fsm_data);
      break;
  }
}

