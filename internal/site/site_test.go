package site

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
)

func TestParseHost(t *testing.T) {
	cases := []struct {
		host, override string
		site           Site
		apex, url      string
	}{
		{"oeiuwq.com", "", Hub, "oeiuwq.com", "//codes.oeiuwq.com/"},
		{"www.oeiuwq.com", "", Hub, "oeiuwq.com", "//codes.oeiuwq.com/"},
		{"codes.oeiuwq.com", "", Codes, "oeiuwq.com", "//codes.oeiuwq.com/"},
		{"LOVE.oeiuwq.com:443", "", Love, "oeiuwq.com", "//codes.oeiuwq.com:443/"},
		{"nope.oeiuwq.com", "", Hub, "oeiuwq.com", "//codes.oeiuwq.com/"},
		{"stars.localhost:8080", "", Stars, "localhost", "//codes.localhost:8080/"},
		{"localhost:8080", "faith", Faith, "localhost", "//codes.localhost:8080/"},
		{"127.0.0.1:8080", "", Hub, "127.0.0.1", "//codes.127.0.0.1:8080/"},
	}
	for _, c := range cases {
		h := ParseHost(c.host, c.override)
		if h.Site != c.site || h.Apex != c.apex || h.URL(Codes) != c.url {
			t.Errorf("%s %q: got site %v apex %q url %q", c.host, c.override, h.Site, h.Apex, h.URL(Codes))
		}
	}
	if d := ParseHost("codes.oeiuwq.com", "").CookieDomain(); d != "oeiuwq.com" {
		t.Errorf("cookie domain %q", d)
	}
	if d := ParseHost("codes.localhost:8080", "").CookieDomain(); d != "" {
		t.Errorf("localhost cookie domain %q", d)
	}
}

// srv is built once: loading the embedded READMEs takes about a second.
var srv *Server

func TestMain(m *testing.M) {
	s, err := New(nil, nil, false)
	if err != nil {
		panic(err)
	}
	srv = s
	os.Exit(m.Run())
}

// newServer returns the shared server with sql as its GH Archive backend.
func newServer(_ *testing.T, sql SQL) *Server {
	if sql == nil {
		sql = func(context.Context, string) ([]byte, int, error) { return []byte(`{"data":[]}`), 200, nil }
	}
	srv.sql = sql
	return srv
}

func get(s *Server, host, path string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	r := httptest.NewRequest("GET", path, nil)
	r.Host = host
	for _, c := range cookies {
		r.AddCookie(c)
	}
	w := httptest.NewRecorder()
	s.ServeHTTP(w, r)
	return w
}

func TestEverySitePage(t *testing.T) {
	s := newServer(t, nil)
	for _, st := range Sites {
		host := "oeiuwq.com"
		if l := st.Info().Label; l != "" {
			host = l + ".oeiuwq.com"
		}
		w := get(s, host, "/")
		body := w.Body.String()
		mod := st.Info().Module
		if w.Code != 200 || !strings.Contains(body, `Elm["`+mod+`"].init`) || !strings.Contains(body, "/static/js/"+mod+".js") {
			t.Fatalf("%s: code %d, page does not start %s:\n%s", host, w.Code, mod, body)
		}
		if js := get(s, host, "/static/js/"+mod+".js"); js.Code != 200 || js.Body.Len() < 1000 {
			t.Fatalf("%s: bundle code %d len %d", mod, js.Code, js.Body.Len())
		}
		if css := get(s, host, "/static/css/"+strings.ToLower(mod)+".css"); css.Code != 200 {
			t.Fatalf("%s: stylesheet code %d", mod, css.Code)
		}
	}
}

func TestDataRoutes(t *testing.T) {
	s := newServer(t, nil)
	for _, p := range []string{"/api/profile", "/api/repos", "/api/stars", "/api/contrib", "/api/sponsors", "/api/posts", "/api/cards", "/api/cv", "/api/themes", "/api/search?q=nix", "/api/readme?repo=vic/vic"} {
		if w := get(s, "oeiuwq.com", p); w.Code != 200 || w.Body.Len() < 2 {
			t.Errorf("%s: code %d len %d", p, w.Code, w.Body.Len())
		}
	}
	if w := get(s, "oeiuwq.com", "/api/readme?repo=no/such"); w.Code != 404 {
		t.Errorf("unknown readme: code %d", w.Code)
	}
}

func TestThemeCookie(t *testing.T) {
	s := newServer(t, nil)
	post := func(body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("POST", "/api/theme", strings.NewReader(body))
		r.Host = "codes.oeiuwq.com"
		w := httptest.NewRecorder()
		s.ServeHTTP(w, r)
		return w
	}
	if w := post("base16/dark/not-a-scheme"); w.Code != 404 || len(w.Result().Cookies()) != 0 {
		t.Fatalf("unknown scheme: code %d cookies %v", w.Code, w.Result().Cookies())
	}
	w := post("base16/dark/3024")
	cs := w.Result().Cookies()
	if w.Code != 200 || len(cs) != 1 || cs[0].Value != "base16/dark/3024" || cs[0].Domain != "oeiuwq.com" {
		t.Fatalf("code %d cookies %v", w.Code, cs)
	}
	page := get(s, "blog.oeiuwq.com", "/", cs[0]).Body.String()
	want := "--base00:#" + s.schemes["base16/dark/3024"].Palette["base00"][1:]
	if !strings.Contains(page, want) || strings.Contains(page, "--base00:#292a44") {
		t.Fatalf("page does not use the cookie scheme %s", want)
	}
	if !strings.Contains(get(s, "blog.oeiuwq.com", "/").Body.String(), "--base00:#292a44") {
		t.Fatal("default page is not Rebecca")
	}
}

func TestArchiveFacts(t *testing.T) {
	calls := 0
	answer, code := `{"meta":[],"data":[["ann","vic/den"],["bo","denful/zen"]]}`, 200
	s := newServer(t, func(_ context.Context, q string) ([]byte, int, error) {
		calls++
		if !strings.Contains(q, "WatchEvent") {
			t.Errorf("not the stargazer query: %.60s", q)
		}
		return []byte(answer), code, nil
	})
	s.cache = archiveCache{}
	if w := get(s, "codes.oeiuwq.com", "/api/archive/drop_table"); w.Code != 404 || calls != 0 {
		t.Fatalf("unknown source: code %d calls %d", w.Code, calls)
	}
	w := get(s, "codes.oeiuwq.com", "/api/archive/stargazer")
	if w.Code != 200 || w.Body.String() != `{"rows":[["ann","vic/den"],["bo","denful/zen"]]}` {
		t.Fatalf("code %d body %s", w.Code, w.Body.String())
	}
	answer, code = "Code: 241. DB::Exception: memory limit", 500
	if w := get(s, "codes.oeiuwq.com", "/api/archive/stargazer"); w.Code != 200 || calls != 1 {
		t.Fatalf("cached answer: code %d calls %d", w.Code, calls)
	}
	s.cache = archiveCache{}
	if w := get(s, "codes.oeiuwq.com", "/api/archive/stargazer"); w.Code != 502 || calls != 2 {
		t.Fatalf("failed query: code %d calls %d", w.Code, calls)
	}
}

func TestRowsRejectsNonIntegers(t *testing.T) {
	if _, err := rows([]byte(`{"data":[["a",1.5]]}`)); err == nil {
		t.Fatal("1.5 accepted as an integer")
	}
	if b, err := rows([]byte(`{"data":[["a",3]]}`)); err != nil || string(b) != `{"rows":[["a",3]]}` {
		t.Fatalf("%s %v", b, err)
	}
}

// In dev mode every link of every page stays on the one host and opens
// the app it names.
func TestDevLinksStayOnOneHost(t *testing.T) {
	s := newServer(t, nil)
	s.dev = true
	defer func() { s.dev = false }()
	links := regexp.MustCompile(`"(/\?site=[a-z]+)"`)
	for _, from := range Sites {
		page := get(s, "127.0.0.1:8080", (Host{Dev: true}).URL(from)).Body.String()
		if !strings.Contains(page, `Elm["`+from.Info().Module+`"]`) {
			t.Fatalf("%s: page does not start its app", from.Info().Module)
		}
		if strings.Contains(page, `"//`) || strings.Contains(page, `href="//`) {
			t.Fatalf("%s: page links to another host", from.Info().Module)
		}
		found := map[string]bool{} // each link is in the noscript list and in the app flags
		for _, m := range links.FindAllStringSubmatch(page, -1) {
			found[m[1]] = true
		}
		if len(found) != len(Sites) {
			t.Fatalf("%s: %d site links, want %d", from.Info().Module, len(found), len(Sites))
		}
		for link := range found {
			label := strings.TrimPrefix(link, "/?site=")
			want := Hub
			if label != homeLabel {
				want, _ = ByLabel(label)
			}
			if body := get(s, "127.0.0.1:8080", link).Body.String(); !strings.Contains(body, `Elm["`+want.Info().Module+`"]`) {
				t.Fatalf("%s: link %s does not open %s", from.Info().Module, link, want.Info().Module)
			}
		}
	}
	// the hub link must win over a subdomain host too
	if !strings.Contains(get(s, "codes.localhost:8080", "/?site=home").Body.String(), `Elm["Hub"]`) {
		t.Fatal("?site=home on codes.localhost is not the hub")
	}
}

func TestLoveLetter(t *testing.T) {
	var got []string
	s := newServer(t, nil)
	s.beep = func(_ context.Context, text string) error { got = append(got, text); return nil }
	s.sent = letters{}
	defer func() { s.beep = nil }()
	post := func(ctype, body, addr string) int {
		r := httptest.NewRequest("POST", "/api/love", strings.NewReader(body))
		r.Header.Set("Content-Type", ctype)
		r.Header.Set("User-Agent", `evil"agent`)
		r.RemoteAddr = addr
		w := httptest.NewRecorder()
		s.ServeHTTP(w, r)
		return w.Code
	}
	if c := post("text/plain", `{"love":"hi"}`, "1.2.3.4:5"); c != 415 {
		t.Fatalf("text/plain: %d", c)
	}
	if c := post("application/json", `{"love":"  "}`, "1.2.3.4:5"); c != 400 {
		t.Fatalf("empty letter: %d", c)
	}
	if c := post("application/json", `{"love":"`+strings.Repeat("x", maxLetter)+`"}`, "1.2.3.4:5"); c != 400 {
		t.Fatalf("too long: %d", c)
	}
	if c := post("application/json; charset=utf-8", `{"love":"Hello \"vic\""}`, "[2001:db8::1]:5"); c != 200 || len(got) != 1 {
		t.Fatalf("letter: %d, sent %d", c, len(got))
	}
	var sent map[string]string
	if err := json.Unmarshal([]byte(got[0]), &sent); err != nil || sent["love"] != `Hello "vic"` || sent["agent"] != `evil"agent` || sent["addr"] != "2001:db8::1" {
		t.Fatalf("sent %q (%v)", got[0], err)
	}
	if c := post("application/json", `{"love":"again"}`, "[2001:db8::1]:6"); c != 429 || len(got) != 1 {
		t.Fatalf("second letter at once: %d, sent %d", c, len(got))
	}
	s.beep = func(context.Context, string) error { return errors.New("down") }
	if c := post("application/json", `{"love":"x"}`, "9.9.9.9:1"); c != 502 {
		t.Fatalf("beeper down: %d", c)
	}
	s.beep = nil
	if c := post("application/json", `{"love":"x"}`, "8.8.8.8:1"); c != 503 {
		t.Fatalf("no beeper: %d", c)
	}
}
