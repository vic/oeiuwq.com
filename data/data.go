// Package data embeds the public GitHub data that cmd/fetch writes here at
// build time. Nothing here is fetched at run time.
package data

import (
	"bytes"
	"embed"
	"encoding/json"

	"oeiuwq/internal/model"
)

//go:embed *.json readmes.gz
var files embed.FS

// Raw returns an embedded JSON file as is, to serve without decoding.
func Raw(name string) ([]byte, error) { return files.ReadFile(name) }

// Load decodes an embedded JSON file into v.
func Load(name string, v any) error {
	b, err := files.ReadFile(name)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

// Readmes decodes the embedded README file.
func Readmes() ([]model.Readme, error) {
	b, err := files.ReadFile("readmes.gz")
	if err != nil {
		return nil, err
	}
	return model.DecodeReadmes(bytes.NewReader(b))
}
