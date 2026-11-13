// Package theme reads tinted-theming base16 and base24 schemes.
package theme

import (
	"embed"
	"fmt"
	"io/fs"
	"regexp"
	"strings"
)

//go:embed builtin
var builtin embed.FS

// Scheme is a validated color scheme: Palette holds baseNN keys in order.
type Scheme struct {
	Name    string            `json:"name"`
	System  string            `json:"system"`
	Variant string            `json:"variant"`
	Palette map[string]string `json:"palette"`
}

var (
	hex   = regexp.MustCompile(`^[0-9a-fA-F]{6}$`)
	baseK = regexp.MustCompile(`^base[0-9A-F]{2}$`)
)

// size is the number of colors each system must define.
var size = map[string]int{"base16": 16, "base24": 24}

// ID identifies a scheme. The same name recurs across systems and variants,
// so the name alone is not unique.
func (s Scheme) ID() string {
	return fmt.Sprintf("%s/%s/%s", s.System, s.Variant, s.Name)
}

// value returns the scalar of a `key: value` line: the text inside a quoted
// string, or the bare text before an inline ` #` comment.
func value(raw string) string {
	raw = strings.TrimSpace(raw)
	for _, q := range []string{`"`, `'`} {
		if rest, ok := strings.CutPrefix(raw, q); ok {
			if inner, _, ok := strings.Cut(rest, q); ok {
				return inner
			}
		}
	}
	bare, _, _ := strings.Cut(raw, " #")
	return strings.TrimSpace(bare)
}

// Parse reads the subset of the scheme YAML that tinted-theming defines: top
// level `name`, `system`, `variant` and a `palette:` block of `baseNN: color`.
// Colors are normalized to "#rrggbb"; a scheme that misses a color is an error.
func Parse(b []byte) (Scheme, error) {
	s := Scheme{Palette: map[string]string{}}
	inPalette := false
	for _, line := range strings.Split(string(b), "\n") {
		trim := strings.TrimSpace(line)
		if trim == "" || trim == "---" || strings.HasPrefix(trim, "#") {
			continue
		}
		indented := strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t")
		key, val, ok := strings.Cut(trim, ":")
		if !ok {
			if indented {
				continue // continuation of a block scalar, e.g. description: |
			}
			return Scheme{}, fmt.Errorf("bad line %q", trim)
		}
		val = value(val)
		if !indented {
			inPalette = key == "palette"
			switch key {
			case "name":
				s.Name = val
			case "system":
				s.System = val
			case "variant":
				s.Variant = val
			}
			continue
		}
		if !inPalette {
			continue
		}
		if !baseK.MatchString(key) {
			return Scheme{}, fmt.Errorf("bad palette key %q", key)
		}
		c := strings.TrimPrefix(val, "#")
		if !hex.MatchString(c) {
			return Scheme{}, fmt.Errorf("%s: bad color %q", key, val)
		}
		s.Palette[key] = "#" + strings.ToLower(c)
	}
	want, ok := size[s.System]
	if !ok {
		return Scheme{}, fmt.Errorf("unknown system %q", s.System)
	}
	if s.Name == "" {
		return Scheme{}, fmt.Errorf("scheme has no name")
	}
	if len(s.Palette) != want {
		return Scheme{}, fmt.Errorf("%s needs %d colors, got %d", s.System, want, len(s.Palette))
	}
	for i := 0; i < want; i++ {
		if _, ok := s.Palette[fmt.Sprintf("base%02X", i)]; !ok {
			return Scheme{}, fmt.Errorf("missing base%02X", i)
		}
	}
	return s, nil
}

// LoadDir parses every *.yaml/*.yml in fsys; bad files are returned as errors.
// A scheme whose ID was already loaded is an error and is skipped.
func LoadDir(fsys fs.FS, dir string) ([]Scheme, []error) {
	var out []Scheme
	var errs []error
	seen := map[string]string{}
	ents, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, []error{err}
	}
	for _, e := range ents {
		n := e.Name()
		if e.IsDir() || (!strings.HasSuffix(n, ".yaml") && !strings.HasSuffix(n, ".yml")) {
			continue
		}
		b, err := fs.ReadFile(fsys, dir+"/"+n)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		s, err := Parse(b)
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", n, err))
			continue
		}
		if prev, dup := seen[s.ID()]; dup {
			errs = append(errs, fmt.Errorf("%s: %s already loaded from %s", n, s.ID(), prev))
			continue
		}
		seen[s.ID()] = n
		out = append(out, s)
	}
	return out, errs
}

// Builtin returns the schemes compiled into the binary.
func Builtin() []Scheme {
	s, errs := LoadDir(builtin, "builtin")
	if len(errs) > 0 {
		panic(errs[0]) // a bad embedded scheme is a build bug; theme_test covers it
	}
	return s
}
