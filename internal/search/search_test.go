package search

import (
	"strings"
	"testing"

	"oeiuwq/internal/model"
)

func fixture() *Index {
	own := []model.Repo{
		{FullName: "vic/fx-rs", Description: "Effects for Rust", Stars: 10},
		{FullName: "vic/den", Description: "Nix aspects", Stars: 400},
	}
	stars := []model.Repo{
		{FullName: "kyo/kyo", Description: "Toolkit for Scala", Stars: 900},
		{FullName: "vic/den", Description: "dup of own", Stars: 400},
	}
	readmes := []model.Readme{
		{Repo: "kyo/kyo", Text: "Kyo has algebraic Effects. ÉÑ " + strings.Repeat("x", 300)},
		{Repo: "vic/den", Text: "Den uses effects too, Effects everywhere"},
	}
	return New(own, stars, readmes)
}

func names(hs []Hit) []string {
	var out []string
	for _, h := range hs {
		out = append(out, h.Repo.FullName)
	}
	return out
}

func TestRanking(t *testing.T) {
	got := names(fixture().Search("effects", All, 10))
	want := []string{"vic/fx-rs", "vic/den", "kyo/kyo"}
	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("got %v want %v", got, want)
	}
}

func TestEveryWordMustMatch(t *testing.T) {
	if got := names(fixture().Search("effects scala", All, 10)); len(got) != 1 || got[0] != "kyo/kyo" {
		t.Fatalf("got %v", got)
	}
	if got := fixture().Search("nothinghere", All, 10); len(got) != 0 {
		t.Fatalf("got %v", names(got))
	}
}

func TestScopeAndDedup(t *testing.T) {
	if got := names(fixture().Search("den", Starred, 10)); len(got) != 0 {
		t.Fatalf("own repo leaked into starred scope: %v", got)
	}
	if got := names(fixture().Search("den", Mine, 10)); len(got) != 1 {
		t.Fatalf("want one vic/den, got %v", got)
	}
}

func TestSnippetIsValidUTF8AroundMatch(t *testing.T) {
	h := fixture().Search("algebraic", All, 1)
	if len(h) != 1 || !strings.Contains(h[0].Snippet, "algebraic") {
		t.Fatalf("got %+v", h)
	}
	if !strings.Contains(h[0].Snippet, "ÉÑ") {
		t.Fatalf("multibyte text cut: %q", h[0].Snippet)
	}
}
