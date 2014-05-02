

window.onload = function() {
  var ppp = new PPP();
  ppp.registerProtocol(LCP);
  ppp.init();

  var ws = new WebSocket("ws://127.0.0.1:8080/websocket");
  ws.binaryType = 'arraybuffer';
  ws.onmessage = function (msg) {
    var buffer = new Uint8Array(msg.data);
    ppp.parse_ppp(buffer);
    //ws.send(evt.data); //loop data back
  };
}
