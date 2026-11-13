// Package model holds the types of the public GitHub data that cmd/fetch writes.
package model

import (
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
)

// Profile is the public GitHub profile.
type Profile struct {
	Login       string `json:"login"`
	Name        string `json:"name"`
	Bio         string `json:"bio"`
	Blog        string `json:"blog"`
	Location    string `json:"location"`
	Followers   int    `json:"followers"`
	PublicRepos int    `json:"publicRepos"`
	CreatedAt   string `json:"createdAt"`
	AvatarURL   string `json:"avatarUrl"`
}

// Repo is a public repository, own or starred.
type Repo struct {
	FullName    string   `json:"fullName"`
	Owner       string   `json:"owner"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Language    string   `json:"language"`
	Topics      []string `json:"topics"`
	Stars       int      `json:"stars"`
	Forks       int      `json:"forks"`
	Fork        bool     `json:"fork"`
	Archived    bool     `json:"archived"`
	CreatedAt   string   `json:"createdAt"`
	PushedAt    string   `json:"pushedAt"`
	URL         string   `json:"url"`
	Homepage    string   `json:"homepage"`
	// StarredAt is set only on starred repos.
	StarredAt string `json:"starredAt,omitempty"`
}

// Day is the contribution count of one day.
type Day struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// RepoYear is how much vic did in one public repository in one year.
type RepoYear struct {
	Repo    string `json:"repo"`
	Commits int    `json:"commits"`
	PRs     int    `json:"prs"`
	Issues  int    `json:"issues"`
}

// Year is the public contribution record of one calendar year.
type Year struct {
	Year  int        `json:"year"`
	Total int        `json:"total"`
	Days  []Day      `json:"days"`
	Repos []RepoYear `json:"repos"`
}

// Sponsor is a public GitHub sponsor.
type Sponsor struct {
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl"`
}

// Readme is the README text of one repository at its last push.
type Readme struct {
	Repo     string `json:"repo"`
	PushedAt string `json:"pushedAt"`
	Text     string `json:"text"`
}

// sep ends every field of the README file: repo, pushedAt, text, repeated.
// Decoding by splitting on it is many times faster than JSON for 40 MB of text.
const sep = 0

// EncodeReadmes writes rs as gzip of NUL-terminated fields. A field that
// holds a NUL is an error: it would split the record.
func EncodeReadmes(w io.Writer, rs []Readme) error {
	z := gzip.NewWriter(w)
	for _, r := range rs {
		for _, f := range []string{r.Repo, r.PushedAt, r.Text} {
			if bytes.IndexByte([]byte(f), sep) >= 0 {
				return fmt.Errorf("%s: a field holds a NUL byte", r.Repo)
			}
			if _, err := io.WriteString(z, f); err != nil {
				return err
			}
			if _, err := z.Write([]byte{sep}); err != nil {
				return err
			}
		}
	}
	return z.Close()
}

// DecodeReadmes reads what EncodeReadmes wrote.
func DecodeReadmes(r io.Reader) ([]Readme, error) {
	z, err := gzip.NewReader(r)
	if err != nil {
		return nil, err
	}
	defer z.Close()
	b, err := io.ReadAll(z)
	if err != nil {
		return nil, err
	}
	if len(b) == 0 {
		return []Readme{}, nil
	}
	if b[len(b)-1] != sep {
		return nil, errors.New("README file does not end with a field end")
	}
	fs := bytes.Split(b[:len(b)-1], []byte{sep})
	if len(fs)%3 != 0 {
		return nil, fmt.Errorf("README file has %d fields, not a multiple of 3", len(fs))
	}
	out := make([]Readme, 0, len(fs)/3)
	for i := 0; i < len(fs); i += 3 {
		out = append(out, Readme{Repo: string(fs[i]), PushedAt: string(fs[i+1]), Text: string(fs[i+2])})
	}
	return out, nil
}
