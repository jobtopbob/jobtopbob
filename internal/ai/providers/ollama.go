package providers

import "github.com/jobtopbob/jobtopbob/internal/ai"

const defaultOllamaBaseURL = "http://ollama:11434/v1"

// NewOllama creates an Ollama provider using its OpenAI-compatible endpoint.
func NewOllama(cfg ai.ProviderConfig) *OpenAIProvider {
	if cfg.BaseURL == "" {
		cfg.BaseURL = defaultOllamaBaseURL
	}
	if cfg.Model == "" {
		cfg.Model = "llama3.2"
	}
	return NewOpenAI(cfg)
}
