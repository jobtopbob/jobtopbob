package providers

import (
	"fmt"

	"github.com/jobtopbob/jobtopbob/internal/ai"
)

// New creates an AI provider based on the given configuration.
func New(cfg ai.ProviderConfig) (ai.Provider, error) {
	switch cfg.Provider {
	case "openai":
		return NewOpenAI(cfg), nil
	case "openrouter":
		return NewOpenRouter(cfg), nil
	case "anthropic":
		return NewAnthropic(cfg), nil
	case "gemini":
		return NewGemini(cfg)
	case "ollama":
		return NewOllama(cfg), nil
	default:
		return nil, fmt.Errorf("unsupported AI provider: %q", cfg.Provider)
	}
}
