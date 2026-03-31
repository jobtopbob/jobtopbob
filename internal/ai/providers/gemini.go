package providers

import (
	"context"
	"fmt"

	"google.golang.org/genai"

	"github.com/jobtopbob/jobtopbob/internal/ai"
)

// GeminiProvider implements ai.Provider using the native Google Gen AI SDK.
type GeminiProvider struct {
	client *genai.Client
	model  string
}

// NewGemini creates a provider backed by the Google Gemini API.
func NewGemini(cfg ai.ProviderConfig) (*GeminiProvider, error) {
	clientCfg := &genai.ClientConfig{
		APIKey:  cfg.APIKey,
		Backend: genai.BackendGeminiAPI,
	}
	if cfg.BaseURL != "" {
		clientCfg.HTTPOptions = genai.HTTPOptions{
			BaseURL: cfg.BaseURL,
		}
	}

	client, err := genai.NewClient(context.Background(), clientCfg)
	if err != nil {
		return nil, fmt.Errorf("create gemini client: %w", err)
	}

	return &GeminiProvider{
		client: client,
		model:  cfg.Model,
	}, nil
}

func (p *GeminiProvider) buildConfig(req ai.CompletionRequest) *genai.GenerateContentConfig {
	config := &genai.GenerateContentConfig{}

	if req.SystemPrompt != "" {
		config.SystemInstruction = &genai.Content{
			Parts: []*genai.Part{{Text: req.SystemPrompt}},
		}
	}

	if req.Temperature != 0 {
		config.Temperature = genai.Ptr(req.Temperature)
	}

	if req.MaxTokens != 0 {
		config.MaxOutputTokens = int32(req.MaxTokens)
	}

	return config
}

// Complete sends a non-streaming request and returns the full response text.
func (p *GeminiProvider) Complete(ctx context.Context, req ai.CompletionRequest) (string, error) {
	result, err := p.client.Models.GenerateContent(
		ctx,
		p.model,
		genai.Text(req.UserPrompt),
		p.buildConfig(req),
	)
	if err != nil {
		return "", fmt.Errorf("gemini complete: %w", err)
	}

	text := result.Text()
	if text == "" {
		return "", fmt.Errorf("gemini: empty response")
	}

	return text, nil
}

// Stream sends a streaming request and returns a channel of response chunks.
func (p *GeminiProvider) Stream(ctx context.Context, req ai.CompletionRequest) (<-chan ai.StreamChunk, error) {
	ch := make(chan ai.StreamChunk)

	go func() {
		defer close(ch)

		for chunk, err := range p.client.Models.GenerateContentStream(
			ctx,
			p.model,
			genai.Text(req.UserPrompt),
			p.buildConfig(req),
		) {
			if err != nil {
				return
			}

			text := chunk.Text()
			if text == "" {
				continue
			}

			select {
			case ch <- ai.StreamChunk{Delta: text}:
			case <-ctx.Done():
				return
			}
		}

		select {
		case ch <- ai.StreamChunk{Done: true}:
		case <-ctx.Done():
		}
	}()

	return ch, nil
}
