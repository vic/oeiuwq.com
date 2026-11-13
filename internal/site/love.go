package site

import (
	"context"
	"encoding/json"
	"io"
	"mime"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Beeper delivers one message to vic, eg a Zulip incoming webhook.
type Beeper func(ctx context.Context, text string) error

// maxLetter bounds the body of one love letter.
const maxLetter = 16 << 10

// letterGap is how long one address waits between two letters.
const letterGap = 20 * time.Second

// letters remembers when each address last sent a letter.
type letters struct {
	mu   sync.Mutex
	last map[string]time.Time
}

// allow is false when addr sent a letter less than letterGap ago.
func (l *letters) allow(addr string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.last == nil {
		l.last = map[string]time.Time{}
	}
	if t, ok := l.last[addr]; ok && now.Sub(t) < letterGap {
		return false
	}
	for a, t := range l.last { // forget old senders, so the map stays small
		if now.Sub(t) >= letterGap {
			delete(l.last, a)
		}
	}
	l.last[addr] = now
	return true
}

// love takes {"love": "..."} and sends it to vic with the sender's user
// agent and address, as the old beeper CGI did.
func (s *Server) love(w http.ResponseWriter, r *http.Request) {
	if s.beep == nil {
		writeJSON(w, 503, map[string]string{"error": "letters are not delivered on this server"})
		return
	}
	if mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type")); err != nil || mt != "application/json" {
		writeJSON(w, 415, map[string]string{"error": "send application/json"})
		return
	}
	var in struct {
		Love string `json:"love"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, maxLetter)).Decode(&in); err != nil || strings.TrimSpace(in.Love) == "" {
		writeJSON(w, 400, map[string]string{"error": `send {"love": "your letter"}`})
		return
	}
	addr, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		addr = r.RemoteAddr
	}
	if !s.sent.allow(addr, time.Now()) {
		writeJSON(w, 429, map[string]string{"error": "one letter at a time, please wait a little"})
		return
	}
	text, err := json.Marshal(map[string]string{"love": in.Love, "agent": r.UserAgent(), "addr": addr})
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	if err := s.beep(ctx, string(text)); err != nil {
		writeJSON(w, 502, map[string]string{"error": "the letter could not be delivered"})
		return
	}
	writeJSON(w, 200, map[string]string{"ok": "delivered"})
}
