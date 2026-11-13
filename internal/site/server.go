package site

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strconv"
	"strings"

	"oeiuwq/content"
	"oeiuwq/data"
	"oeiuwq/internal/model"
	"oeiuwq/internal/search"
	"oeiuwq/internal/theme"
)

//go:embed static
var static embed.FS

// DefaultScheme is the scheme of a visitor who has not picked one.
const DefaultScheme = "base16/dark/Rebecca"

const themeCookie = "theme"

// blob is a response body kept in memory, with its gzip form.
type blob struct {
	ctype     string
	raw, gz   []byte
	immutable bool
}

func newBlob(ctype string, raw []byte, immutable bool) blob {
	var b bytes.Buffer
	z, _ := gzip.NewWriterLevel(&b, gzip.BestCompression) // the level is a valid constant
	_, _ = z.Write(raw)                                   // writes to a bytes.Buffer do not fail
	_ = z.Close()
	return blob{ctype: ctype, raw: raw, gz: b.Bytes(), immutable: immutable}
}

func (b blob) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Content-Type", b.ctype)
	h.Set("Vary", "Accept-Encoding")
	if b.immutable {
		h.Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		h.Set("Cache-Control", "public, max-age=600")
	}
	body := b.raw
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		h.Set("Content-Encoding", "gzip")
		body = b.gz
	}
	h.Set("Content-Length", strconv.Itoa(len(body)))
	_, _ = w.Write(body)
}

// Server is the HTTP handler of the whole site.
type Server struct {
	mux     *http.ServeMux
	index   *search.Index
	schemes map[string]theme.Scheme
	version string
	page    *template.Template
	sql     SQL
	dev     bool
	beep    Beeper
	sent    letters
	cache   archiveCache
}

// SQL runs one of the fixed read-only GH Archive queries and returns its
// JSONCompact answer. Visitors never send SQL.
type SQL func(ctx context.Context, query string) ([]byte, int, error)

// New loads the embedded data and builds every route. With dev, links
// between sites stay on the one host the visitor uses.
func New(sql SQL, beep Beeper, dev bool) (*Server, error) {
	s := &Server{mux: http.NewServeMux(), schemes: map[string]theme.Scheme{}, sql: sql, beep: beep, dev: dev}
	var own, stars []model.Repo
	if err := data.Load("repos.json", &own); err != nil {
		return nil, err
	}
	if err := data.Load("stars.json", &stars); err != nil {
		return nil, err
	}
	readmes, err := data.Readmes()
	if err != nil {
		return nil, err
	}
	s.index = search.New(own, stars, readmes)

	schemes := theme.Builtin()
	for _, sc := range schemes {
		s.schemes[sc.ID()] = sc
	}
	if _, ok := s.schemes[DefaultScheme]; !ok {
		return nil, fmt.Errorf("default scheme %s not built in", DefaultScheme)
	}

	sum := sha256.New()
	err = fs.WalkDir(static, "static", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, err := static.ReadFile(p)
		if err != nil {
			return err
		}
		sum.Write(b)
		ctype := mime.TypeByExtension(path.Ext(p))
		if ctype == "" {
			ctype = "application/octet-stream"
		}
		s.mux.Handle("GET /"+p, newBlob(ctype, b, true))
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.version = hex.EncodeToString(sum.Sum(nil))[:10]

	for _, name := range []string{"profile", "repos", "stars", "contrib", "sponsors"} {
		b, err := data.Raw(name + ".json")
		if err != nil {
			return nil, err
		}
		s.mux.Handle("GET /api/"+name, newBlob("application/json", b, false))
	}
	for route, dir := range map[string]string{"posts": "blog", "cards": "faith"} {
		docs, err := content.Dir(dir)
		if err != nil {
			return nil, err
		}
		b, err := json.Marshal(docs)
		if err != nil {
			return nil, err
		}
		s.mux.Handle("GET /api/"+route, newBlob("application/json", b, false))
	}
	cv, err := content.CV()
	if err != nil {
		return nil, err
	}
	s.mux.Handle("GET /api/cv", newBlob("text/markdown; charset=utf-8", cv, false))
	tb, err := json.Marshal(schemes)
	if err != nil {
		return nil, err
	}
	s.mux.Handle("GET /api/themes", newBlob("application/json", tb, false))
	s.mux.HandleFunc("POST /api/theme", s.setTheme)
	s.mux.HandleFunc("GET /api/search", s.search)
	s.mux.HandleFunc("GET /api/readme", s.readme)
	s.mux.HandleFunc("GET /api/archive/{name}", s.archive)
	s.mux.HandleFunc("POST /api/love", s.love)
	s.mux.HandleFunc("GET /robots.txt", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "User-agent: *\nAllow: /\n") })
	s.mux.HandleFunc("GET /{$}", s.servePage)

	s.page, err = template.New("page").Parse(pageHTML)
	return s, err
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	s.mux.ServeHTTP(w, r)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v) // the client went away; nothing to do
}

func (s *Server) scheme(r *http.Request) theme.Scheme {
	if c, err := r.Cookie(themeCookie); err == nil {
		if sc, ok := s.schemes[c.Value]; ok {
			return sc
		}
	}
	return s.schemes[DefaultScheme]
}

func (s *Server) setTheme(w http.ResponseWriter, r *http.Request) {
	b, err := io.ReadAll(io.LimitReader(r.Body, 256))
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	id := strings.TrimSpace(string(b))
	if _, ok := s.schemes[id]; !ok {
		writeJSON(w, 404, map[string]string{"error": "unknown scheme " + id})
		return
	}
	host := ParseHost(r.Host, "")
	http.SetCookie(w, &http.Cookie{
		Name: themeCookie, Value: id, Path: "/", Domain: host.CookieDomain(),
		MaxAge: 365 * 24 * 3600, SameSite: http.SameSiteLaxMode, Secure: r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https",
	})
	writeJSON(w, 200, map[string]string{"theme": id})
}

// maxQuery bounds a search: every word scans every README.
const maxQuery = 200

func (s *Server) search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, err := strconv.Atoi(q.Get("limit"))
	if err != nil || limit <= 0 || limit > 200 {
		limit = 50
	}
	query := q.Get("q")
	if len(query) > maxQuery {
		writeJSON(w, 400, map[string]string{"error": "the query is too long"})
		return
	}
	writeJSON(w, 200, s.index.Search(query, search.ParseScope(q.Get("scope")), limit))
}

func (s *Server) readme(w http.ResponseWriter, r *http.Request) {
	repo := r.URL.Query().Get("repo")
	text, ok := s.index.Readme(repo)
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "unknown repo " + repo})
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=600")
	_, _ = io.WriteString(w, text)
}

type pageData struct {
	Info    Info
	Site    string
	Version string
	Root    template.CSS
	Flags   template.JS
	Links   []link
}

type link struct{ Title, URL string }

func (s *Server) servePage(w http.ResponseWriter, r *http.Request) {
	host := ParseHost(r.Host, r.URL.Query().Get("site"))
	host.Dev = s.dev
	sc := s.scheme(r)
	var root strings.Builder
	root.WriteString(":root{")
	for i := 0; i < 16; i++ {
		k := fmt.Sprintf("base%02X", i)
		fmt.Fprintf(&root, "--%s:%s;", k, sc.Palette[k])
	}
	root.WriteString("}")
	sites := map[string]string{}
	var links []link
	for _, st := range Sites {
		name := st.Info().Label
		if name == "" {
			name = "home"
		}
		sites[name] = host.URL(st)
		links = append(links, link{st.Info().Title, host.URL(st)})
	}
	flags, err := json.Marshal(map[string]any{"scheme": sc.ID(), "sites": sites})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	info := host.Site.Info()
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	err = s.page.Execute(w, pageData{
		Info: info, Site: strings.ToLower(info.Module), Version: s.version,
		Root: template.CSS(root.String()), Flags: template.JS(flags), Links: links,
	})
	if err != nil {
		http.Error(w, err.Error(), 500)
	}
}

// pageHTML is the shell of every app. A site: link to the page it is on only
// changes the hash, so a hash change reloads. An app with a "store" port
// keeps one string in localStorage under its own key. No JS comments inside:
// html/template drops them.
const pageHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{.Info.Title}}</title>
<meta name="description" content="{{.Info.Desc}}">
<link rel="icon" href="/static/img/favicon.svg?v={{.Version}}">
<style>{{.Root}}</style>
<link rel="stylesheet" href="/static/css/base.css?v={{.Version}}">
<link rel="stylesheet" href="/static/css/{{.Site}}.css?v={{.Version}}">
</head>
<body class="{{.Site}}">
<noscript><h1>{{.Info.Title}}</h1><p>{{.Info.Desc}}</p><ul>{{range .Links}}<li><a href="{{.URL}}">{{.Title}}</a></li>{{end}}</ul></noscript>
<div id="app"></div>
<script src="/static/js/{{.Info.Module}}.js?v={{.Version}}"></script>
<script>addEventListener("hashchange",()=>location.reload())</script>
<script>
const key="oeiuwq:"+{{.Info.Module}}, read=()=>{try{return localStorage.getItem(key)}catch(e){return null}};
const app=Elm[{{.Info.Module}}].init({node:document.getElementById("app"),flags:Object.assign({{.Flags}},{hash:location.hash.slice(1),stored:read()})});
if(app.ports&&app.ports.store)app.ports.store.subscribe(v=>{try{v===null?localStorage.removeItem(key):localStorage.setItem(key,v)}catch(e){}});
</script>
</body>
</html>
`
