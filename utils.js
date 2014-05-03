
function byId(e, k) {
  for(var key in e) {
    if(e[key] == k)
      return key;
  }
  return -1;
}


function printBytes(title, buffer) {
  var s = title + ": ";
  for (i=0; i < buffer.length;i++)
    if (buffer[i].toString(16).length == 1) 
      s += "0" + buffer[i].toString(16) + " ";
    else
      s += buffer[i].toString(16) + " ";
  s +="len(" + buffer.length+ ")";
  console.log(s);
}


