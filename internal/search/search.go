// Package search ranks repositories by the words of a query, over their name,
// description, topics, language and README.
package search

import (
	"sort"
	"strings"

	"oeiuwq/internal/model"
)

// Scope limits a search to own repos, starred repos, or both.
type Scope int

const (
	All Scope = iota
	Mine
	Starred
)

// ParseScope reads "mine" and "stars"; anything else is All.
func ParseScope(s string) Scope {
	switch s {
	case "mine":
		return Mine
	case "stars":
		return Starred
	}
	return All
}

type doc struct {
	repo   model.Repo
	mine   bool
	name   string // lower
	meta   string // lower description, topics, language
	readme string // original text
	lower  string // asciiLower(readme): same byte offsets as readme
}

// Index is an immutable search index.
type Index struct{ docs []doc }

// Hit is one ranked result.
type Hit struct {
	Repo    model.Repo `json:"repo"`
	Mine    bool       `json:"mine"`
	Snippet string     `json:"snippet"`
	Score   int        `json:"score"`
}

// asciiLower lowercases A-Z only, so byte offsets stay valid in the original.
func asciiLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if 'A' <= c && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}

// New indexes own and starred repos; a repo in both counts as own.
func New(own, stars []model.Repo, readmes []model.Readme) *Index {
	text := make(map[string]string, len(readmes))
	for _, r := range readmes {
		text[r.Repo] = r.Text
	}
	ix := &Index{}
	seen := map[string]bool{}
	add := func(r model.Repo, mine bool) {
		if seen[r.FullName] {
			return
		}
		seen[r.FullName] = true
		t := text[r.FullName]
		ix.docs = append(ix.docs, doc{
			repo:   r,
			mine:   mine,
			name:   asciiLower(r.FullName),
			meta:   asciiLower(r.Description + " " + strings.Join(r.Topics, " ") + " " + r.Language),
			readme: t,
			lower:  asciiLower(t),
		})
	}
	for _, r := range own {
		add(r, true)
	}
	for _, r := range stars {
		add(r, false)
	}
	return ix
}

// Readme returns the README of repo and whether the index has the repo.
func (ix *Index) Readme(repo string) (string, bool) {
	for _, d := range ix.docs {
		if d.repo.FullName == repo {
			return d.readme, true
		}
	}
	return "", false
}

// Search returns at most limit repos that hold every word of q, best first.
// A word in the name weighs most, then description and topics, then README.
func (ix *Index) Search(q string, scope Scope, limit int) []Hit {
	words := strings.Fields(asciiLower(q))
	if len(words) == 0 {
		return []Hit{}
	}
	hits := []Hit{}
	for _, d := range ix.docs {
		if (scope == Mine && !d.mine) || (scope == Starred && d.mine) {
			continue
		}
		score, at, ok := 0, -1, true
		for _, w := range words {
			s := 0
			if strings.Contains(d.name, w) {
				s += 8
			}
			if strings.Contains(d.meta, w) {
				s += 4
			}
			if i := strings.Index(d.lower, w); i >= 0 {
				s += 1 + min(strings.Count(d.lower, w), 5)
				if at < 0 {
					at = i
				}
			}
			if s == 0 {
				ok = false
				break
			}
			score += s
		}
		if !ok {
			continue
		}
		snip := d.repo.Description
		if at >= 0 {
			snip = snippet(d.readme, at)
		}
		hits = append(hits, Hit{Repo: d.repo, Mine: d.mine, Snippet: snip, Score: score})
	}
	sort.SliceStable(hits, func(i, j int) bool {
		if hits[i].Score != hits[j].Score {
			return hits[i].Score > hits[j].Score
		}
		return hits[i].Repo.Stars > hits[j].Repo.Stars
	})
	if len(hits) > limit {
		hits = hits[:limit]
	}
	return hits
}

// snippet returns about 160 bytes of text around at, on one line.
func snippet(text string, at int) string {
	from, to := max(0, at-60), min(len(text), at+100)
	for from > 0 && !isStart(text[from]) {
		from--
	}
	for to < len(text) && !isStart(text[to]) {
		to++
	}
	s := strings.Join(strings.Fields(text[from:to]), " ")
	return strings.ToValidUTF8(s, "")
}

// isStart is true at a byte that begins a UTF-8 character.
func isStart(b byte) bool { return b&0xC0 != 0x80 }
