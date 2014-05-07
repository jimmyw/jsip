package main

import (
	"bufio"
	"code.google.com/p/go.net/websocket"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os/exec"
	"time"
)

type Server struct {
	last_ip net.IP
}

type Session struct {
	ws     *websocket.Conn
	cmd    *exec.Cmd
	stdout io.ReadCloser
	stderr io.ReadCloser
	stdin  io.WriteCloser
	ip     net.IP
}

func NewServer() *Server {
	return &Server{last_ip: net.IPv4(10, 0, 0, 2)}
}

func (self *Server) NewSession() *Session {
	sess := &Session{ip: self.last_ip}
	self.last_ip[15] = self.last_ip[15] + 1
	return sess
}

func hexdump(d []byte) string {
	ret := ""
	for x := range d {
		if ret != "" {
			ret += " "
		}
		ret += fmt.Sprintf("%.2x", d[x])
	}
	return ret
}

func (self *Session) startProc(closing chan string) {
	var err error
	self.cmd = exec.Command(
		"/usr/sbin/pppd",
		"notty",
		"lcp-echo-interval", "60",
		"lcp-echo-failure", "2",
		"nodetach",
		"nomagic",
		"novj",
		"default-asyncmap",
		"nodeflate",
		"noaccomp",
		"nobsdcomp",
		"nopcomp",
		"local",
		"nodefaultroute",
		"debug",
		"logfile", "/dev/stderr",
		fmt.Sprintf("10.0.0.1:%s", self.ip))
	if self.stdout, err = self.cmd.StdoutPipe(); err != nil {
		log.Fatal("StdoutPipe error: ", err)
	}

	if self.stderr, err = self.cmd.StderrPipe(); err != nil {
		log.Fatal("StderrPipe error: ", err)
	}

	go func() {
		for {
			r := bufio.NewReader(self.stderr)
			line, _, err := r.ReadLine()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Fatal("StdErr read error: ", err)
			}
			log.Printf("pppd stderr output  '%s'\n", line)
		}
	}()

	if self.stdin, err = self.cmd.StdinPipe(); err != nil {
		log.Fatal("StdinPipe error: ", err)
	}

	if err = self.cmd.Start(); err != nil {
		log.Fatal("Start error: ", err)
	}

	if err := self.cmd.Wait(); err != nil {
		log.Printf("readLoop() cmdWait erro: %s", err)
	}
	closing <- "StartProc"
}

func (self *Session) writeLoop(closing chan string) {
	for {
		b := make([]byte, 1500)
		l, err := self.stdout.Read(b)
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatal("StdOut read error: ", err)
		}
		if l > 0 {
			//log.Printf("Read byte from pppd '%v'\n", hexdump(b[0:l]))
			websocket.Message.Send(self.ws, b[0:l])
		}
	}
	closing <- "WriteLoop"
}

func (self *Session) readLoop(closing chan string) {
	var data []byte
	var err error
	for err = websocket.Message.Receive(self.ws, &data); err == nil; err = websocket.Message.Receive(self.ws, &data) {
		//log.Printf("Read byte from ws   '%v'\n", hexdump(data))
		self.stdin.Write(data)
	}
	if err == io.EOF {
		return
	}
	if err != nil {
		log.Printf("Recive error readLoop(): %s", err)
	}
	closing <- "ReadLoop"

}
func (self *Session) handleWS(ws *websocket.Conn) {
	self.ws = ws
	closing := make(chan string)
	go self.startProc(closing)
	go self.readLoop(closing)
	go self.writeLoop(closing)
	for {
		select {
		case closer := <-closing:
			log.Printf("Closed by: %v\n", closer)
			return
		}
	}
	self.stdin.Close()
	self.stderr.Close()
	self.stdout.Close()
	self.ws.Close()
}

func (self *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("%v\t%v\t%v\t%v\n", time.Now(), r.Method, r.URL, r.RemoteAddr)
	websocket.Handler(self.NewSession().handleWS).ServeHTTP(w, r)
}
func main() {
	http.Handle("/", http.FileServer(http.Dir(".")))
	http.Handle("/websocket", NewServer())
	http.ListenAndServe("127.0.0.1:8080", nil)
}
