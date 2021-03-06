
function Buffer() {}
Buffer.prototype.buf = new Uint8Array(1500);
Buffer.prototype.pos = 0;
Buffer.prototype.pushByte = function(b) {this.buf[this.pos++] = b;}
Buffer.prototype.get = function() { return this.buf.subarray(0, this.pos);}


function byId(e, k) {
  for(var key in e) {
    if(e[key] == k)
      return key;
  }
  return -1;
}

function byteCopy(src, soff, dst, doff, len) {
  for(var i = 0; i < len; i++)
    dst[doff + i] = src[soff + i];
}
function byteSwap(a, ao, b, bo, len) {
  for(var i = 0; i < len; i++) {
    var tmp = a[ao + i];
    a[ao + i] = b[bo + i];
    b[bo + i] = tmp;
  }
}

function printBytes(title, buffer) {
  var s = title + ": ";
  if(buffer == null) 
    return s + "<null> len(0)";
  for (i=0; i < buffer.length;i++)
    if (buffer[i].toString(16).length == 1) 
      s += "0" + buffer[i].toString(16) + " ";
    else
      s += buffer[i].toString(16) + " ";
  s +="len(" + buffer.length+ ")";
  console.log(s);
}


