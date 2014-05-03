function LCP() {
  this.fsm = new FSM();
}
LCP.protocol_id = 0xc021;
LCP.prototype.init = function(ppp) {
  console.log("LCP: init");
  this.ppp = ppp;
  this.fsm.init(ppp, this);
}
LCP.prototype.input = function(data) {
  printBytes("LCP", data);
  this.fsm.input(data);
}
LCP.prototype.reqci = function(req_ci, reject_if_disagree) {
  console.log("LCP: reqci ", req_ci);
}

