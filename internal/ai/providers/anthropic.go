package providers

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/jobtopbob/jobtopbob/internal/ai"
)

const defaultAnthropicMaxTokens int64 = 4096

// AnthropicProvider implements ai.Provider using the native Anthropic SDK.
type AnthropicProvider struct {
	client anthropic.Client
	model  string
}

// NewAnthropic creates a provider backed by the Anthropic Messages API.
func NewAnthropic(cfg ai.ProviderConfig) *AnthropicProvider {
	opts := []option.RequestOption{
		option.WithAPIKey(cfg.APIKey),
	}
	if cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.BaseURL))
	}

	return &AnthropicProvider{
		client: anthropic.NewClient(opts...),
		model:  cfg.Model,
	}
}

func (p *AnthropicProvider) buildParams(req ai.CompletionRequest) anthropic.MessageNewParams {
	maxTokens := int64(req.MaxTokens)
	if maxTokens == 0 {
		maxTokens = defaultAnthropicMaxTokens
	}

	params := anthropic.MessageNewParams{
		Model:     p.model,
		MaxTokens: maxTokens,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(req.UserPrompt)),
		},
	}

	if req.SystemPrompt != "" {
		params.System = []anthropic.TextBlockParam{
			{Text: req.SystemPrompt},
		}
	}

	if req.Temperature != 0 {
		params.Temperature = anthropic.Float(float64(req.Temperature))
	}

	return params
}

// Complete sends a non-streaming message and returns the full response text.
func (p *AnthropicProvider) Complete(ctx context.Context, req ai.CompletionRequest) (string, error) {
	msg, err := p.client.Messages.New(ctx, p.buildParams(req))
	if err != nil {
		return "", fmt.Errorf("anthropic complete: %w", err)
	}

	if len(msg.Content) == 0 {
		return "", fmt.Errorf("anthropic: empty response content")
	}

	for _, block := range msg.Content {
		if tb, ok := block.AsAny().(anthropic.TextBlock); ok {
			return tb.Text, nil
		}
	}

	return "", fmt.Errorf("anthropic: no text block in response")
}

// Stream sends a streaming message and returns a channel of response chunks.
func (p *AnthropicProvider) Stream(ctx context.Context, req ai.CompletionRequest) (<-chan ai.StreamChunk, error) {
	stream := p.client.Messages.NewStreaming(ctx, p.buildParams(req))

	ch := make(chan ai.StreamChunk)
	go func() {
		defer close(ch)

		for stream.Next() {
			event := stream.Current()

			delta, ok := event.AsAny().(anthropic.ContentBlockDeltaEvent)
			if !ok {
				continue
			}
			td, ok := delta.Delta.AsAny().(anthropic.TextDelta)
			if !ok || td.Text == "" {
				continue
			}

			select {
			case ch <- ai.StreamChunk{Delta: td.Text}:
			case <-ctx.Done():
				return
			}
		}

		if stream.Err() != nil {
			return
		}

		select {
		case ch <- ai.StreamChunk{Done: true}:
		case <-ctx.Done():
		}
	}()

	return ch, nil
}
