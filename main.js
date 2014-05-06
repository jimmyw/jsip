

window.onload = function() {
  var ppp = new PPP();
  ppp.init();

  var ip = new IP();
  ip.registerDevice(ppp);
  ip.init();

  var ws = new WebSocket("ws://127.0.0.1:8080/websocket");
  ws.binaryType = 'arraybuffer';
  ppp.send_cb = function(data) {
    //printBytes("MAIN: sent", data);
    ws.send(data);
  }
  ws.onclose = function() {
    ppp.stop();
  }
  ws.onopen = function() {
    setTimeout(function() { ppp.start();}, 1000);
  }
  ws.onmessage = function (msg) {
    var data = new Uint8Array(msg.data);
    //printBytes("MAIN: recv", data);
    ppp.recv(data);
  };
}
