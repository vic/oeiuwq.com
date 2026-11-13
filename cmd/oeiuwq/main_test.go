package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestListenAddr(t *testing.T) {
	for _, c := range []struct{ ip, port, want string }{
		{"", "", ":8080"},
		{"127.0.0.1", "9000", "127.0.0.1:9000"},
		{"::", "80", "[::]:80"},
		{"2001:db8::1", "443", "[2001:db8::1]:443"},
	} {
		t.Setenv("IP", c.ip)
		t.Setenv("PORT", c.port)
		if got := listenAddr(); got != c.want {
			t.Errorf("IP=%q PORT=%q: %q, want %q", c.ip, c.port, got, c.want)
		}
	}
}

func TestZulip(t *testing.T) {
	var key, text string
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key = r.URL.Query().Get("api_key")
		b, _ := io.ReadAll(r.Body)
		var in map[string]string
		_ = json.Unmarshal(b, &in)
		text = in["text"]
	}))
	defer fake.Close()
	t.Setenv("ZULIP_URL", fake.URL)
	t.Setenv("ZULIP_KEY", "s3cret")
	if err := zulip()(context.Background(), `{"love":"hi"}`); err != nil || key != "s3cret" || text != `{"love":"hi"}` {
		t.Fatalf("err %v key %q text %q", err, key, text)
	}
	t.Setenv("ZULIP_URL", "http://127.0.0.1:1")
	err := zulip()(context.Background(), "x")
	if err == nil || strings.Contains(err.Error(), "s3cret") {
		t.Fatalf("an unreachable Zulip must fail without the key in the error: %v", err)
	}
	t.Setenv("ZULIP_KEY", "")
	if zulip() != nil {
		t.Fatal("no key must mean no beeper")
	}
}
