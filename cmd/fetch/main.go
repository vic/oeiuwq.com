// Command fetch writes the public GitHub data of the site into data/.
// It needs a GitHub token in GITHUB_TOKEN, or a logged-in gh CLI.
// Private repositories are never written, even when the token can see them.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"oeiuwq/internal/model"
)

// readmeCap bounds one README. shortcut: longer READMEs are cut, raise it if search misses their tails.
const readmeCap = 64 << 10

type client struct {
	token string
	http  *http.Client
}

func (c *client) get(url, accept string) ([]byte, int, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, 0, err
	}
	if strings.HasPrefix(url, "https://api.github.com/") {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	b, err := io.ReadAll(res.Body)
	return b, res.StatusCode, err
}

func (c *client) rest(path, accept string, v any) error {
	b, code, err := c.get("https://api.github.com/"+path, accept)
	if err != nil {
		return err
	}
	if code != 200 {
		return fmt.Errorf("GET %s: %d %s", path, code, b)
	}
	return json.Unmarshal(b, v)
}

// pages reads every page of a list endpoint.
func pages[T any](c *client, path, accept string) ([]T, error) {
	var all []T
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	for p := 1; ; p++ {
		var page []T
		if err := c.rest(fmt.Sprintf("%s%sper_page=100&page=%d", path, sep, p), accept, &page); err != nil {
			return nil, err
		}
		all = append(all, page...)
		if len(page) < 100 {
			return all, nil
		}
	}
}

func (c *client) graphql(query string, vars map[string]any, v any) error {
	body, err := json.Marshal(map[string]any{"query": query, "variables": vars})
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", "https://api.github.com/graphql", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	var out struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return err
	}
	if len(out.Errors) > 0 {
		return fmt.Errorf("graphql: %s", out.Errors[0].Message)
	}
	return json.Unmarshal(out.Data, v)
}

type ghRepo struct {
	FullName    string                 `json:"full_name"`
	Name        string                 `json:"name"`
	Owner       struct{ Login string } `json:"owner"`
	Description string                 `json:"description"`
	Language    string                 `json:"language"`
	Topics      []string               `json:"topics"`
	Stars       int                    `json:"stargazers_count"`
	Forks       int                    `json:"forks_count"`
	Fork        bool                   `json:"fork"`
	Archived    bool                   `json:"archived"`
	Private     bool                   `json:"private"`
	CreatedAt   string                 `json:"created_at"`
	PushedAt    string                 `json:"pushed_at"`
	URL         string                 `json:"html_url"`
	Homepage    string                 `json:"homepage"`
}

func (r ghRepo) repo(starredAt string) model.Repo {
	t := r.Topics
	if t == nil {
		t = []string{}
	}
	return model.Repo{
		FullName: r.FullName, Owner: r.Owner.Login, Name: r.Name, Description: r.Description,
		Language: r.Language, Topics: t, Stars: r.Stars, Forks: r.Forks, Fork: r.Fork,
		Archived: r.Archived, CreatedAt: r.CreatedAt, PushedAt: r.PushedAt, URL: r.URL,
		Homepage: r.Homepage, StarredAt: starredAt,
	}
}

func write(dir, name string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, name), b, 0o644)
}

func token() (string, error) {
	if t := os.Getenv("GITHUB_TOKEN"); t != "" {
		return t, nil
	}
	b, err := exec.Command("gh", "auth", "token").Output()
	return strings.TrimSpace(string(b)), err
}

func main() {
	user := flag.String("user", "vic", "GitHub user")
	orgs := flag.String("orgs", "denful", "comma separated organizations whose public repos count as own")
	dir := flag.String("out", "data", "output directory")
	workers := flag.Int("workers", 16, "parallel README downloads")
	flag.Parse()
	t, err := token()
	if err != nil || t == "" {
		log.Fatalf("no GitHub token: set GITHUB_TOKEN or run gh auth login (%v)", err)
	}
	c := &client{token: t, http: &http.Client{Timeout: 30 * time.Second}}
	if err := run(c, *user, strings.Split(*orgs, ","), *dir, *workers); err != nil {
		log.Fatal(err)
	}
}

func run(c *client, user string, orgs []string, dir string, workers int) error {
	var p struct {
		Login       string `json:"login"`
		Name        string `json:"name"`
		Bio         string `json:"bio"`
		Blog        string `json:"blog"`
		Location    string `json:"location"`
		Followers   int    `json:"followers"`
		PublicRepos int    `json:"public_repos"`
		CreatedAt   string `json:"created_at"`
		AvatarURL   string `json:"avatar_url"`
	}
	if err := c.rest("users/"+user, "", &p); err != nil {
		return err
	}
	if err := write(dir, "profile.json", model.Profile(p)); err != nil {
		return err
	}
	log.Printf("profile %s", p.Login)

	var own []model.Repo
	sources := []string{"users/" + user + "/repos?type=owner"}
	for _, o := range orgs {
		if o != "" {
			sources = append(sources, "orgs/"+o+"/repos?type=public")
		}
	}
	for _, src := range sources {
		rs, err := pages[ghRepo](c, src, "")
		if err != nil {
			return err
		}
		for _, r := range rs {
			if !r.Private {
				own = append(own, r.repo(""))
			}
		}
	}
	sort.Slice(own, func(i, j int) bool { return own[i].PushedAt > own[j].PushedAt })
	if err := write(dir, "repos.json", own); err != nil {
		return err
	}
	log.Printf("repos %d", len(own))

	type starred struct {
		StarredAt string `json:"starred_at"`
		Repo      ghRepo `json:"repo"`
	}
	ss, err := pages[starred](c, "users/"+user+"/starred", "application/vnd.github.star+json")
	if err != nil {
		return err
	}
	var stars []model.Repo
	for _, s := range ss {
		if !s.Repo.Private {
			stars = append(stars, s.Repo.repo(s.StarredAt))
		}
	}
	if err := write(dir, "stars.json", stars); err != nil {
		return err
	}
	log.Printf("stars %d", len(stars))

	years, err := contributions(c, user, p.CreatedAt)
	if err != nil {
		return err
	}
	if err := write(dir, "contrib.json", years); err != nil {
		return err
	}
	log.Printf("contribution years %d", len(years))

	sp, err := sponsors(c, user)
	if err != nil {
		return err
	}
	if err := write(dir, "sponsors.json", sp); err != nil {
		return err
	}
	log.Printf("sponsors %d", len(sp))

	return readmes(c, dir, append(own, stars...), workers)
}

const contribQuery = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){
contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}
commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner isPrivate} contributions{totalCount}}
pullRequestContributionsByRepository(maxRepositories:100){repository{nameWithOwner isPrivate} contributions{totalCount}}
issueContributionsByRepository(maxRepositories:100){repository{nameWithOwner isPrivate} contributions{totalCount}}}}}`

type byRepo []struct {
	Repository struct {
		NameWithOwner string
		IsPrivate     bool
	}
	Contributions struct{ TotalCount int }
}

func contributions(c *client, user, since string) ([]model.Year, error) {
	first, err := time.Parse(time.RFC3339, since)
	if err != nil {
		return nil, err
	}
	var out []model.Year
	for y := first.Year(); y <= time.Now().Year(); y++ {
		var r struct {
			User struct {
				ContributionsCollection struct {
					ContributionCalendar struct {
						TotalContributions int
						Weeks              []struct {
							ContributionDays []struct {
								Date              string
								ContributionCount int
							}
						}
					}
					CommitContributionsByRepository      byRepo
					PullRequestContributionsByRepository byRepo
					IssueContributionsByRepository       byRepo
				}
			}
		}
		vars := map[string]any{"login": user, "from": fmt.Sprintf("%d-01-01T00:00:00Z", y), "to": fmt.Sprintf("%d-12-31T23:59:59Z", y)}
		if err := c.graphql(contribQuery, vars, &r); err != nil {
			return nil, fmt.Errorf("year %d: %w", y, err)
		}
		cc := r.User.ContributionsCollection
		yr := model.Year{Year: y, Total: cc.ContributionCalendar.TotalContributions, Days: []model.Day{}, Repos: []model.RepoYear{}}
		for _, w := range cc.ContributionCalendar.Weeks {
			for _, d := range w.ContributionDays {
				yr.Days = append(yr.Days, model.Day{Date: d.Date, Count: d.ContributionCount})
			}
		}
		idx := map[string]int{}
		add := func(rs byRepo, f func(*model.RepoYear, int)) {
			for _, x := range rs {
				if x.Repository.IsPrivate {
					continue
				}
				n := x.Repository.NameWithOwner
				i, ok := idx[n]
				if !ok {
					i = len(yr.Repos)
					idx[n] = i
					yr.Repos = append(yr.Repos, model.RepoYear{Repo: n})
				}
				f(&yr.Repos[i], x.Contributions.TotalCount)
			}
		}
		add(cc.CommitContributionsByRepository, func(r *model.RepoYear, n int) { r.Commits += n })
		add(cc.PullRequestContributionsByRepository, func(r *model.RepoYear, n int) { r.PRs += n })
		add(cc.IssueContributionsByRepository, func(r *model.RepoYear, n int) { r.Issues += n })
		out = append(out, yr)
	}
	return out, nil
}

func sponsors(c *client, user string) ([]model.Sponsor, error) {
	var r struct {
		User struct {
			SponsorshipsAsMaintainer struct {
				Nodes []struct {
					SponsorEntity struct {
						Login     string
						Name      string
						AvatarURL string
					}
				}
			}
		}
	}
	q := `query($login:String!){user(login:$login){sponsorshipsAsMaintainer(first:100,includePrivate:false){nodes{sponsorEntity{... on User{login name avatarUrl} ... on Organization{login name avatarUrl}}}}}}`
	if err := c.graphql(q, map[string]any{"login": user}, &r); err != nil {
		return nil, err
	}
	out := []model.Sponsor{}
	for _, n := range r.User.SponsorshipsAsMaintainer.Nodes {
		e := n.SponsorEntity
		out = append(out, model.Sponsor{Login: e.Login, Name: e.Name, AvatarURL: e.AvatarURL})
	}
	return out, nil
}

// readmes downloads the README of every repo whose last push differs from the
// copy already in dir, so a nightly run only fetches what changed.
func readmes(c *client, dir string, repos []model.Repo, workers int) error {
	path := filepath.Join(dir, "readmes.gz")
	old := map[string]model.Readme{}
	if f, err := os.Open(path); err == nil {
		rs, err := model.DecodeReadmes(f)
		f.Close()
		if err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		for _, r := range rs {
			old[r.Repo] = r
		}
	}
	seen := map[string]bool{}
	var todo []model.Repo
	var out []model.Readme
	for _, r := range repos {
		if seen[r.FullName] {
			continue
		}
		seen[r.FullName] = true
		if o, ok := old[r.FullName]; ok && o.PushedAt == r.PushedAt {
			out = append(out, o)
			continue
		}
		todo = append(todo, r)
	}
	log.Printf("readmes: %d cached, %d to fetch", len(out), len(todo))
	var mu sync.Mutex
	var wg sync.WaitGroup
	jobs := make(chan model.Repo)
	failed := 0
	for range workers {
		wg.Go(func() {
			for r := range jobs {
				text, err := c.readme(r.FullName)
				mu.Lock()
				if err != nil {
					failed++
					log.Printf("readme %s: %v", r.FullName, err)
				} else { // a failed one stays out, so the next run retries it
					out = append(out, model.Readme{Repo: r.FullName, PushedAt: r.PushedAt, Text: text})
				}
				mu.Unlock()
			}
		})
	}
	for _, r := range todo {
		jobs <- r
	}
	close(jobs)
	wg.Wait()
	sort.Slice(out, func(i, j int) bool { return out[i].Repo < out[j].Repo })
	var buf bytes.Buffer
	if err := model.EncodeReadmes(&buf, out); err != nil {
		return err
	}
	log.Printf("readmes %d (%d failed), %d bytes gzip", len(out), failed, buf.Len())
	return os.WriteFile(path, buf.Bytes(), 0o644)
}

// readme returns the README text of repo, or "" when it has none.
// README.md on raw.githubusercontent.com costs no API quota; the API finds the other names.
func (c *client) readme(repo string) (string, error) {
	b, code, err := c.get("https://raw.githubusercontent.com/"+repo+"/HEAD/README.md", "")
	if err == nil && code == 404 {
		b, code, err = c.get("https://api.github.com/repos/"+repo+"/readme", "application/vnd.github.raw")
	}
	if err != nil {
		return "", err
	}
	switch code {
	case 200:
		if len(b) > readmeCap {
			b = b[:readmeCap]
		}
		return strings.ToValidUTF8(string(b), ""), nil
	case 404:
		return "", nil
	default:
		return "", fmt.Errorf("status %d", code)
	}
}
