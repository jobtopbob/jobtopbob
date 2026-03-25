package prompts

import "embed"

//go:embed *.txt
var promptFS embed.FS

// Get reads a prompt template by name (without the .txt extension).
func Get(name string) (string, error) {
	data, err := promptFS.ReadFile(name + ".txt")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
