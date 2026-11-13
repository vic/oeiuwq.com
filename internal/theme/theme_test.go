package theme

import (
	"fmt"
	"strings"
	"testing"
	"testing/fstest"
)

func scheme(system string, n int) string {
	var b strings.Builder
	fmt.Fprintf(&b, "system: %q\nname: \"T\"\nvariant: \"dark\"\npalette:\n", system)
	for i := 0; i < n; i++ {
		fmt.Fprintf(&b, "  base%02X: \"%06x\"\n", i, i*1000)
	}
	return b.String()
}

func TestBuiltinValid(t *testing.T) {
	const id = "base16/dark/3024"
	for _, s := range Builtin() {
		if s.ID() == id {
			if len(s.Palette) != 16 || s.Palette["base00"] == "" {
				t.Fatalf("%s: bad palette %v", id, s.Palette)
			}
			return
		}
	}
	t.Fatalf("builtin %s not loaded", id)
}

func TestDuplicateID(t *testing.T) {
	fsys := fstest.MapFS{
		"d/a.yaml": {Data: []byte(scheme("base16", 16))},
		"d/b.yaml": {Data: []byte(scheme("base16", 16))},
	}
	ss, errs := LoadDir(fsys, "d")
	if len(ss) != 1 || len(errs) != 1 {
		t.Fatalf("want 1 scheme and 1 duplicate error, got %d schemes, errs %v", len(ss), errs)
	}
}

func TestBase24(t *testing.T) {
	s, err := Parse([]byte(scheme("base24", 24)))
	if err != nil || len(s.Palette) != 24 || s.Palette["base17"] == "" {
		t.Fatalf("%v %v", s, err)
	}
}

func TestRejects(t *testing.T) {
	for name, in := range map[string]string{
		"base24 with 16":  scheme("base24", 16),
		"base16 with 24":  scheme("base16", 24),
		"unknown system":  scheme("base99", 16),
		"bad color":       strings.Replace(scheme("base16", 16), "000000", "zzzzzz", 1),
		"bad palette key": scheme("base16", 16) + "  hello: \"ffffff\"\n",
	} {
		if _, err := Parse([]byte(in)); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
}
