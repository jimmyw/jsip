

window.onload = function() {
  var ppp = new PPP();
  ppp.registerProtocol(LCP);
  ppp.registerProtocol(IPCP);
  ppp.init();
  ppp.on_ip = function(data) {
      console.log("IP PACKET DATA len:", data.length);
      printBytes("MAIN: ip", data);
  }

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
