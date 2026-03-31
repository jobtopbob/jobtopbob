package providers

import "github.com/jobtopbob/jobtopbob/internal/ai"

const defaultOpenRouterBaseURL = "https://openrouter.ai/api/v1"

// NewOpenRouter creates an OpenRouter provider using its OpenAI-compatible endpoint.
func NewOpenRouter(cfg ai.ProviderConfig) *OpenAIProvider {
	if cfg.BaseURL == "" {
		cfg.BaseURL = defaultOpenRouterBaseURL
	}
	return NewOpenAI(cfg)
}
