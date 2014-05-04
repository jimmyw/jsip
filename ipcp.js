
function IPCP() {
  this.fsm = new FSM();
}
IPCP.prototype.protocol_id = 0x8021;
IPCP.prototype.name = "IPCP";
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
