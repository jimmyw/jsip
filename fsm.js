function FSM() {};

// Statics
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
FSM.OPT_PASSIVE = 1; /* Don't die if we don't get a response */
FSM.OPT_RESTART = 2; /* Treat 2nd OPEN as DOWN, UP */
FSM.OPT_SILENT  = 4; /* Wait for peer to speak first */

// Prototypes
FSM.prototype.state = FSM.LinkStates.LS_INITIAL;
FSM.prototype.flags = 0;
FSM.prototype.init = function(ppp, proto) {
  console.log("FSM: init");
  this.ppp = ppp;
  this.proto = proto;
  this.peer_mru = PPP.MRU;
}
FSM.prototype.nakloops = 0;
FSM.prototype.maxconfreqtransmits = 10;
FSM.prototype.retransmits = 0;
FSM.prototype.peer_mru = 0;
FSM.prototype.id = 0;
FSM.prototype.reqid = 0;
FSM.prototype.seen_ack = false;

// Functions
FSM.prototype.sdata = function(code, id, fsm_data) {
  var outlen = (fsm_data ? fsm_data.length : 0) + FSM.HEADERLEN;
  var send_buf = new Uint8Array(PPP.HDRLEN + outlen);

  // PPP header
  send_buf[0] = PPP.Pack.ALLSTATIONS;
  send_buf[1] = PPP.Pack.UI;
  send_buf[2] = this.proto.protocol_id >> 8;
  send_buf[3] = this.proto.protocol_id & 0xff;

  // LCP header
  send_buf[4] = code;
  send_buf[5] = id;
  send_buf[6] = outlen >> 8;
  send_buf[7] = outlen & 0xff;
  
  // LCP FSM data
  if(fsm_data) {
    var j = PPP.HDRLEN + FSM.HEADERLEN;
    for (var i = 0; i < fsm_data.length; i++) {
      send_buf[j++] = fsm_data[i];
    }
  }
  printBytes("FSM: sdata", send_buf.subarray(0, outlen + PPP.HDRLEN));
  this.ppp.send(send_buf.subarray(0, outlen + PPP.HDRLEN));
}

FSM.prototype.GotConfRequest = function(id, fsm_data) {
  var old_state = this.state;
  //printBytes("FSM: fsm_data", fsm_data);
  var code;
  switch(this.state) {
    case FSM.LinkStates.LS_CLOSED:
      /* Go away, we're closed */
      this.sdata(FSM.Codes.TERMACK, id, null);
      return;
    case FSM.LinkStates.LS_CLOSING:
    case FSM.LinkStates.LS_STOPPING:
      return;

    case FSM.LinkStates.LS_OPENED:
      /* Go down and restart negotiation */
      if(this.proto.down) {
        this.proto.down(this);  /* Inform upper layers */
      }
      this.sconfreq(0);    /* Send initial Configure-Request */
      break;

    case FSM.LinkStates.LS_STOPPED:
      /* Negotiation started by our peer */
      this.sconfreq(0);    /* Send initial Configure-Request */
      this.state = FSM.LinkStates.LS_REQSENT;
      break;
  }
 
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
  console.log("FSM: GotConfRequest ", byId(FSM.LinkStates,old_state), "-->", byId(FSM.LinkStates,this.state));
}

FSM.prototype.input = function(data) {

  // Parse 4 byte header
  var code = data[0];
  var id = data[1];
  var len = ((data[2] << 8) | data[3]) - FSM.HEADERLEN;
  var fsm_data = data.subarray(FSM.HEADERLEN, FSM.HEADERLEN + len); 
  console.log("FSM: Code:", code, "id:", id, "len:", len);
  //printBytes("FSM: package", data);
  //printBytes("FSM: package data", fsm_data);

  switch (code) {
    case FSM.Codes.CONFREQ:
      this.GotConfRequest(id, fsm_data);
      break;
    default:
      throw "Unhandeled code " + code;
  }
}

FSM.prototype.sconfreq = function(retransmit)
{
  if(this.state != FSM.LinkStates.LS_REQSENT && this.state != FSM.LinkStates.LS_ACKRCVD && this.state != FSM.LinkStates.LS_ACKSENT ) {
    /* Not currently negotiating - reset options */
    if(this.proto.resetci) {
      this.proto.resetci();
    }
    this.nakloops = 0;
  }
  
  if(!retransmit) {
    /* New request - reset retransmission counter, use new ID */
    this.retransmits = this.maxconfreqtransmits;
    this.reqid = ++this.id;
  }
  
  this.seen_ack = false;
  
  /*
   * Make up the request packet
   */
  var out_data = null;
  if(this.proto.addci) {
    out_data = this.proto.addci();
  }

  /* send the request to our peer */
  this.sdata(FSM.Codes.CONFREQ, this.reqid, out_data);
  
  /* start the retransmit timer */
  --this.retransmits;
}

FSM.prototype.lowerup = function() {
  var old_state = this.state;
  switch(this.state) {
    case FSM.LinkStates.LS_INITIAL:
      this.state = FSM.LinkStates.LS_CLOSED;
      break;

    case FSM.LinkStates.LS_STARTING:
      if( this.flags & FSM.OPT_SILENT ) {
        this.state = FSM.LinkStates.LS_STOPPED;
      } else {
        /* Send an initial configure-request */
        this.sconfreq(0);
        this.state = FSM.LinkStates.LS_REQSENT;
      }
    break;

    default:
      throw "Up event in state " + this.state;
  }
  console.log("FSM: lowerup ", byId(FSM.LinkStates,old_state), "-->", byId(FSM.LinkStates,this.state));
}

FSM.prototype.open = function() {
  var old_state = this.state;
  switch(this.state) {
    case FSM.LinkStates.LS_INITIAL:
      this.state = FSM.LinkStates.LS_STARTING;
      if( this.proto.starting ) {
        this.proto.starting();
      }
      break;

    case FSM.LinkStates.LS_CLOSED:
      if( this.flags & FSM.OPT_SILENT ) {
        this.state = FSM.LinkStates.LS_STOPPED;
      } else {
        /* Send an initial configure-request */
        this.sconfreq(0);
        this.state = FSM.LinkStates.LS_REQSENT;
      }
      break;
  
    case FSM.LinkStates.LS_CLOSING:
      this.state = FSM.LinkStates.LS_STOPPING;
      /* fall through */
    case FSM.LinkStates.LS_STOPPED:
    case FSM.LinkStates.LS_OPENED:
      if( this.flags & FSM.OPT_RESTART ) {
        this.lowerdown();
        this.lowerup(f);
      }
      break;
  }
  console.log("FSM: open ", byId(FSM.LinkStates,old_state), "-->", byId(FSM.LinkStates,this.state));
}

