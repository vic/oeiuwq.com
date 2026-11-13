package site

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sync"
	"time"
)

// mine selects the repositories of vic and of the denful organization.
const mine = "(repo_name LIKE 'vic/%' OR repo_name LIKE 'denful/%')"

// archiveQueries are the only GH Archive queries the server runs. Each one
// becomes the facts of one predicate in the logic window of codes.
var archiveQueries = map[string]string{
	// gh_stargazer(Person, Repo): who stars the repos of vic.
	"stargazer": "SELECT DISTINCT actor_login, repo_name FROM github_events WHERE event_type = 'WatchEvent' AND " + mine + " LIMIT 20000",
	// gh_star(Person, Repo): what those people star, on the 300 repos they star most.
	"star": "WITH people AS (SELECT DISTINCT actor_login FROM github_events WHERE event_type = 'WatchEvent' AND " + mine + "), " +
		"top AS (SELECT repo_name FROM github_events WHERE event_type = 'WatchEvent' AND actor_login IN people AND NOT " + mine +
		" GROUP BY repo_name ORDER BY uniq(actor_login) DESC LIMIT 300) " +
		"SELECT DISTINCT actor_login, repo_name FROM github_events WHERE event_type = 'WatchEvent' AND actor_login IN people AND repo_name IN top LIMIT 50000",
	// gh_kin(Person, Shared): people who star the same repos as vic, and how many.
	"kin": "SELECT actor_login, toInt64(uniq(repo_name)) AS shared FROM github_events WHERE event_type = 'WatchEvent' " +
		"AND repo_name IN (SELECT repo_name FROM github_events WHERE event_type = 'WatchEvent' AND actor_login = 'vic') " +
		"AND actor_login != 'vic' GROUP BY actor_login ORDER BY shared DESC LIMIT 500",
	// gh_event(Repo, Year, Events): what vic did, by repository and year.
	"event": "SELECT repo_name, toInt64(toYear(created_at)) AS y, toInt64(count()) AS n FROM github_events WHERE actor_login = 'vic' GROUP BY repo_name, y",
}

// archiveTTL is how long one answer of GH Archive is served before it is asked again.
const archiveTTL = 6 * time.Hour

type archiveEntry struct {
	body []byte
	at   time.Time
}

type archiveCache struct {
	mu      sync.Mutex
	entries map[string]archiveEntry
}

// rows turns a JSONCompact answer into rows of strings and integers.
func rows(compact []byte) ([]byte, error) {
	var res struct {
		Data [][]any `json:"data"`
	}
	if err := json.Unmarshal(compact, &res); err != nil {
		return nil, err
	}
	out := make([][]any, 0, len(res.Data))
	for _, r := range res.Data {
		row := make([]any, len(r))
		for i, v := range r {
			switch x := v.(type) {
			case string:
				row[i] = x
			case float64:
				if x != math.Trunc(x) {
					return nil, fmt.Errorf("value %v is not an integer", x)
				}
				row[i] = int64(x)
			default:
				return nil, fmt.Errorf("value %v is not a string or a number", v)
			}
		}
		out = append(out, row)
	}
	return json.Marshal(map[string]any{"rows": out})
}

func (s *Server) archive(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	q, ok := archiveQueries[name]
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "unknown fact source " + name})
		return
	}
	s.cache.mu.Lock()
	e, hit := s.cache.entries[name]
	s.cache.mu.Unlock()
	if !hit || time.Since(e.at) > archiveTTL {
		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()
		out, code, err := s.sql(ctx, q)
		if err == nil && code != 200 {
			err = fmt.Errorf("GH Archive answered %d: %.300s", code, out)
		}
		var body []byte
		if err == nil {
			body, err = rows(out)
		}
		if err != nil {
			if hit { // a stale answer beats none
				body = e.body
			} else {
				writeJSON(w, 502, map[string]string{"error": err.Error()})
				return
			}
		} else {
			s.cache.mu.Lock()
			if s.cache.entries == nil {
				s.cache.entries = map[string]archiveEntry{}
			}
			s.cache.entries[name] = archiveEntry{body: body, at: time.Now()}
			s.cache.mu.Unlock()
		}
		e.body = body
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(e.body)
}
