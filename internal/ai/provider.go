package ai

import "context"

// CompletionRequest holds the parameters for an AI completion call.
type CompletionRequest struct {
	SystemPrompt string
	UserPrompt   string
	MaxTokens    int
	Temperature  float32
}

// Provider defines the interface for AI model providers.
type Provider interface {
	// Complete sends a prompt and returns the full response text.
	Complete(ctx context.Context, req CompletionRequest) (string, error)
}

// ProviderConfig holds the configuration for creating a provider.
type ProviderConfig struct {
	// Provider type: "openai", "openrouter", or "ollama"
	Provider string
	// API key for the provider (not needed for Ollama)
	APIKey string
	// Base URL override (e.g., "https://openrouter.ai/api/v1" or "http://ollama:11434/v1")
	BaseURL string
	// Model name (e.g., "gpt-4o", "claude-sonnet-4-20250514", "llama3.2")
	Model string
}
