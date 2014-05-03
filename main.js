

window.onload = function() {
  var ppp = new PPP();
  ppp.registerProtocol(LCP);
  ppp.init();

  var ws = new WebSocket("ws://127.0.0.1:8080/websocket");
  window.ws = ws;
  ws.binaryType = 'arraybuffer';
  ws.onmessage = function (msg) {
    var buffer = new Uint8Array(msg.data);
    ppp.send = function(data) {
      printBytes("sent: ", data);
      ws.send(data);
    }
    ppp.parse_ppp(buffer);
  };
}
