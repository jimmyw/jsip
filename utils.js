
function byId(e, k) {
  for(var key in e) {
    if(e[key] == k)
      return key;
  }
  return -1;
}


function printBytes(title, buffer) {
  var s = title + "(" + buffer.length+ "): ";
  for (i=0; i < buffer.length;i++)
    s += buffer[i].toString(16) + " ";
  console.log(s);
}


