function LCP() { }
LCP.protocol_id = 0xc021;
LCP.prototype.input = function(data) {
  printBytes("LCP", data);
}


