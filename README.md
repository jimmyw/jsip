# jsip
Full TCP/IP stack written in JavaScript

This completely unnessesary but cool project to parse and send TCP/IP packages over a PPP frame over a websocket connection to your host computer.

Have no real uses, more then to learn how to create TCP packages :)

To enable pppd on osx do this scary stuff:
```
  echo "noauth" | sudo tee /etc/ppp/options
  sudo chmod 4755 /usr/sbin/pppd
```
