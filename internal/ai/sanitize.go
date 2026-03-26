package ai

import "regexp"

var xmlTagRe = regexp.MustCompile(`<[^>]*>`)

// Sanitise strips XML/HTML tags from user input to prevent prompt injection
// when content is placed inside <user_content> delimiters.
func Sanitise(s string) string {
	return xmlTagRe.ReplaceAllString(s, "")
}
