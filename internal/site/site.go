// Package site serves every subdomain of oeiuwq.com: one Elm app per host
// and the JSON API they share.
package site

import (
	"net"
	"strings"
)

// Site is one subdomain. Each has its own Elm app, stylesheet and look.
type Site int

const (
	Hub Site = iota
	Codes
	Portfolio
	Blog
	Faith
	Love
	Sponsor
	Stars
	Projects
	Smalltalk
	Nes
	Adventure
)

// Info is what the page shell needs to know about a site.
type Info struct {
	Label  string // subdomain label; "" for the hub
	Module string // Elm module and bundle name
	Title  string
	Desc   string
}

// Sites lists every site in the order the hub shows them.
var Sites = []Site{Hub, Codes, Projects, Smalltalk, Nes, Adventure, Portfolio, Blog, Faith, Love, Sponsor, Stars}

var infos = map[Site]Info{
	Hub:       {"", "Hub", "oeiuwq", "Victor Borja (vic): open source, compilers, effect systems, Nix, faith."},
	Codes:     {"codes", "Codes", "codes · oeiuwq", "Every public repository of vic since 2008, on a timeline, with SQL over GH Archive."},
	Portfolio: {"portfolio", "Portfolio", "portfolio · oeiuwq", "CV and track record of Victor Borja."},
	Blog:      {"blog", "Blog", "blog · oeiuwq", "Posts by vic."},
	Faith:     {"faith", "Faith", "faith · oeiuwq", "Faith, scripture and berean.faith."},
	Love:      {"love", "Love", "love · oeiuwq", "A love letter. Write one back."},
	Sponsor:   {"sponsor", "Sponsor", "sponsor · oeiuwq", "Fund the open source work of vic."},
	Stars:     {"stars", "Stars", "stars · oeiuwq", "Full-text search over every repository vic made or starred."},
	Projects:  {"projects", "Projects", "projects · oeiuwq", "Every project of vic as a source file in a Turbo IDE."},
	Smalltalk: {"smalltalk", "Smalltalk", "smalltalk · oeiuwq", "A small Smalltalk whose image lives in your browser."},
	Nes:       {"nes", "Nes", "nes · oeiuwq", "NEON VIGIL, an 8-bit action game in a cyberpunk arcology."},
	Adventure: {"adventure", "Adventure", "adventure · oeiuwq", "An interactive text adventure on a Commodore screen."},
}

// Info returns the page facts of s.
func (s Site) Info() Info { return infos[s] }

// ByLabel finds the site of a subdomain label.
func ByLabel(label string) (Site, bool) {
	for _, s := range Sites {
		if infos[s].Label == label {
			return s, true
		}
	}
	return Hub, false
}

// Host is a parsed request host: the site it names and the apex domain.
type Host struct {
	Site Site
	Apex string // e.g. "oeiuwq.com" or "localhost"
	Port string // "" for the default port
	// Dev links every site on this one host as "/?site=<label>", so all
	// links work without DNS or subdomains.
	Dev bool
}

// homeLabel names the hub in "?site=", where the empty label cannot.
const homeLabel = "home"

// ParseHost reads "codes.oeiuwq.com", "oeiuwq.com", "codes.localhost:8080".
// An unknown subdomain is the hub. An override ("?site=codes", "?site=home")
// wins over the host.
func ParseHost(hostport, override string) Host {
	host, port, err := net.SplitHostPort(hostport)
	if err != nil {
		host, port = hostport, ""
	}
	labels := strings.Split(strings.ToLower(host), ".")
	h := Host{Site: Hub, Apex: strings.Join(labels, "."), Port: port}
	sub := net.ParseIP(host) == nil && (len(labels) >= 3 || (len(labels) == 2 && labels[1] == "localhost"))
	if sub {
		h.Apex = strings.Join(labels[1:], ".")
		h.Site, _ = ByLabel(labels[0])
	}
	if override == homeLabel {
		h.Site = Hub
	} else if s, ok := ByLabel(override); ok && override != "" {
		h.Site = s
	}
	return h
}

// URL is the address of site s: on its subdomain without a scheme, or in
// dev mode a path on the current host.
func (h Host) URL(s Site) string {
	if h.Dev {
		l := infos[s].Label
		if l == "" {
			l = homeLabel
		}
		return "/?site=" + l
	}
	host := h.Apex
	if l := infos[s].Label; l != "" {
		host = l + "." + h.Apex
	}
	if h.Port != "" {
		host = net.JoinHostPort(host, h.Port)
	}
	return "//" + host + "/"
}

// CookieDomain is the domain the theme cookie is shared on; browsers reject
// a Domain attribute of "localhost", so there it is per host.
func (h Host) CookieDomain() string {
	if h.Apex == "localhost" || net.ParseIP(h.Apex) != nil {
		return ""
	}
	return h.Apex
}
