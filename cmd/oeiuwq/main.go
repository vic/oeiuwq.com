// Command oeiuwq serves every subdomain of oeiuwq.com from one binary.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"oeiuwq/internal/site"
)

// maxResult bounds a GH Archive answer passed on to a visitor.
const maxResult = 2 << 20

// clickhouse sends one query to the public, read-only GH Archive copy of ClickHouse.
func clickhouse(endpoint string) site.SQL {
	client := &http.Client{Timeout: 30 * time.Second}
	slots := make(chan struct{}, 4) // shortcut: a fixed limit of parallel queries, raise it if visitors wait
	return func(ctx context.Context, q string) ([]byte, int, error) {
		select {
		case slots <- struct{}{}:
			defer func() { <-slots }()
		case <-ctx.Done():
			return nil, 0, ctx.Err()
		}
		// The play user is read-only and may not change settings; the server bounds its own work.
		u := endpoint + "?" + url.Values{"user": {"play"}, "default_format": {"JSONCompact"}}.Encode()
		req, err := http.NewRequestWithContext(ctx, "POST", u, strings.NewReader(q))
		if err != nil {
			return nil, 0, err
		}
		res, err := client.Do(req)
		if err != nil {
			return nil, 0, err
		}
		defer res.Body.Close()
		b, err := io.ReadAll(io.LimitReader(res.Body, maxResult+1))
		if err == nil && len(b) > maxResult {
			return nil, 0, fmt.Errorf("the result is larger than %d MiB: add a LIMIT", maxResult>>20)
		}
		return b, res.StatusCode, err
	}
}

func main() {
	addr := flag.String("addr", listenAddr(), "listen address; by default $IP (IPv4 or IPv6, empty for all) and $PORT (8080)")
	ch := flag.String("clickhouse", "https://play.clickhouse.com/", "ClickHouse HTTP endpoint with the github_events table")
	cert := flag.String("cert", "", "TLS certificate chain (PEM); with -key the server speaks HTTPS")
	key := flag.String("key", "", "TLS private key (PEM)")
	redirect := flag.String("redirect", "", "with TLS, also listen here (e.g. :80) and redirect HTTP to HTTPS")
	dev := flag.Bool("dev", false, "serve every site on this one host: links become /?site=<name>")
	flag.Parse()
	if (*cert == "") != (*key == "") {
		log.Fatal("-cert and -key go together")
	}
	s, err := site.New(clickhouse(*ch), zulip(), *dev)
	if err != nil {
		log.Fatal(err)
	}
	srv := &http.Server{
		Addr:              *addr,
		Handler:           s,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      75 * time.Second, // a GH Archive fact source may take a minute
		IdleTimeout:       2 * time.Minute,
	}
	log.Printf("oeiuwq on %s", *addr)
	if *dev {
		devURLs(*addr)
	}
	if *cert == "" {
		log.Fatal(srv.ListenAndServe())
	}
	if *redirect != "" {
		go func() {
			log.Fatal(http.ListenAndServe(*redirect, http.HandlerFunc(toHTTPS)))
		}()
	}
	log.Fatal(srv.ListenAndServeTLS(*cert, *key))
}

// toHTTPS sends a plain HTTP request to the same host on HTTPS.
func toHTTPS(w http.ResponseWriter, r *http.Request) {
	host, _, err := net.SplitHostPort(r.Host)
	if err != nil {
		host = r.Host
	}
	http.Redirect(w, r, "https://"+host+r.URL.RequestURI(), http.StatusMovedPermanently)
}

// devURLs prints the address of every site in dev mode.
func devURLs(addr string) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "localhost"
	}
	for _, s := range site.Sites {
		u := (site.Host{Dev: true}).URL(s)
		log.Printf("  %-9s http://%s%s", s.Info().Module, net.JoinHostPort(host, port), u)
	}
}

// listenAddr is $IP:$PORT; JoinHostPort brackets an IPv6 address.
func listenAddr() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return net.JoinHostPort(os.Getenv("IP"), port)
}

// zulip sends love letters to a Zulip "Slack compatible" incoming webhook,
// $ZULIP_URL with the key in $ZULIP_KEY. Without a key, letters are refused.
func zulip() site.Beeper {
	key := os.Getenv("ZULIP_KEY")
	if key == "" {
		log.Print("ZULIP_KEY is not set: love letters will not be delivered")
		return nil
	}
	endpoint := os.Getenv("ZULIP_URL")
	if endpoint == "" {
		endpoint = "https://oeiuwq.zulipchat.com/api/v1/external/slack_incoming"
	}
	target := endpoint + "?" + url.Values{"api_key": {key}}.Encode()
	client := &http.Client{Timeout: 15 * time.Second}
	return func(ctx context.Context, text string) error {
		body, err := json.Marshal(map[string]string{"text": text})
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, "POST", target, bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		res, err := client.Do(req)
		if err != nil {
			var ue *url.Error
			if errors.As(err, &ue) {
				err = ue.Err // a url.Error prints the URL, and the URL holds the key
			}
			return fmt.Errorf("zulip: %w", err)
		}
		defer res.Body.Close()
		if res.StatusCode != 200 {
			return fmt.Errorf("zulip answered %d", res.StatusCode)
		}
		return nil
	}
}
