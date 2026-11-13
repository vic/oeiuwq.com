// Package content embeds the hand-written text of the site: blog posts and
// faith cards, one markdown file each.
package content

import (
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

//go:embed blog faith cv.md
var files embed.FS

// Doc is one markdown file. A file starts with `key: value` lines, then a
// blank line, then the markdown body.
type Doc struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
	Date  string `json:"date"`
	Body  string `json:"body"`
}

// Parse reads one file; a file without a title is an error.
func Parse(slug, text string) (Doc, error) {
	d := Doc{Slug: slug}
	head, body, _ := strings.Cut(text, "\n\n")
	for _, line := range strings.Split(head, "\n") {
		k, v, ok := strings.Cut(line, ":")
		if !ok {
			return Doc{}, fmt.Errorf("%s: bad header line %q", slug, line)
		}
		switch strings.TrimSpace(k) {
		case "title":
			d.Title = strings.TrimSpace(v)
		case "date":
			d.Date = strings.TrimSpace(v)
		default:
			return Doc{}, fmt.Errorf("%s: unknown header %q", slug, k)
		}
	}
	if d.Title == "" {
		return Doc{}, fmt.Errorf("%s: no title", slug)
	}
	d.Body = strings.TrimSpace(body)
	return d, nil
}

// Dir returns the docs of dir ("blog" or "faith") in file name order.
func Dir(dir string) ([]Doc, error) {
	ents, err := fs.ReadDir(files, dir)
	if err != nil {
		return nil, err
	}
	out := []Doc{}
	for _, e := range ents {
		n := e.Name()
		if !strings.HasSuffix(n, ".md") {
			continue
		}
		b, err := fs.ReadFile(files, dir+"/"+n)
		if err != nil {
			return nil, err
		}
		d, err := Parse(strings.TrimSuffix(n, ".md"), string(b))
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Slug < out[j].Slug })
	return out, nil
}

// CV returns the markdown CV.
func CV() ([]byte, error) { return files.ReadFile("cv.md") }
