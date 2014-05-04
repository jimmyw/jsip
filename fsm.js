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
FSM.HEADERLEN = 4;
FSM.prototype.state = FSM.LinkStates.LS_INITIAL;
FSM.prototype.init = function(ppp, proto) {
  console.log("FSM: init");
  this.ppp = ppp;
  this.proto = proto;
  this.peer_mru = PPP.MRU;
}
FSM.prototype.nakloops = 0;
FSM.prototype.peer_mru = 0;
FSM.prototype.sdata = function(code, id, fsm_data) {
  var send_buf = new Uint8Array(this.peer_mru);
  if (fsm_data.length > this.peer_mru) {
    console.log("To big");
    return;
  }
  var j = PPP.HDRLEN + FSM.HEADERLEN;
  for (var i = 0; i < fsm_data.length; i++) {
    send_buf[j++] = fsm_data[i];
  }
  var outlen = fsm_data.length + FSM.HEADERLEN;
  send_buf[0] = PPP.Pack.ALLSTATIONS;
  send_buf[1] = PPP.Pack.UI;
  send_buf[2] = this.proto.protocol_id >> 8;
  send_buf[3] = this.proto.protocol_id & 0xff;
  send_buf[4] = code;
  send_buf[5] = id;
  send_buf[6] = outlen >> 8;
  send_buf[7] = outlen & 0xff;
  printBytes("FSM: sdata", send_buf.subarray(0, outlen + PPP.HDRLEN));
  this.ppp.send(send_buf.subarray(0, outlen + PPP.HDRLEN));
}
FSM.prototype.ConfRequest = function(id, fsm_data) {
  console.log("FSM: state: " + byId(FSM.LinkStates, this.state));
  printBytes("FSM: fsm_data", fsm_data);
  var code;
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
 
 console.log("FSM: proto ", this.proto.name); 
  if (this.proto.reqci) {
    code = this.proto.reqci(fsm_data);
  }
  
  /* send the Ack, Nak or Rej to the peer */
  this.sdata(code, id, fsm_data);
  
  if (code == FSM.Codes.CONFACK) {
    if (this.state == FSM.LinkStates.LS_ACKRCVD) {
      //UNTIMEOUT(fsm_timeout, f);  /* Cancel timeout */
      this.state = FSM.LinkStates.LS_OPENED;
      if (this.proto.up) {
        this.proto.up();  /* Inform upper layers */
      }
    } else {
      this.state = FSM.LinkStates.LS_ACKSENT;
    }
    this.nakloops = 0;
  } else {
    /* we sent CONFACK or CONFREJ */
    if (this.state != FSM.LinkStates.LS_ACKRCVD) {
      this.state = FSM.LinkStates.LS_REQSENT;
    }
    if(code == FSM.Codes.CONFNAK ) {
      ++this.nakloops;
    }
  }

}
FSM.prototype.input = function(data) {

  // Parse 4 byte header
  var code = data[0];
  var id = data[1];
  var len = ((data[2] << 8) | data[3]) - FSM.HEADERLEN;
  var fsm_data = data.subarray(FSM.HEADERLEN, FSM.HEADERLEN + len); 
  console.log("FSM: Code: " + code);
  console.log("FSM: id: ", id);
  console.log("FSM: len: ", len);
  printBytes("FSM: package", data);
  printBytes("FSM: package data", fsm_data);

  switch (code) {
    case FSM.Codes.CONFREQ:
      this.ConfRequest(id, fsm_data);
      break;
  }
}

