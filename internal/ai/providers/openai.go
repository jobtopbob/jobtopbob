package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/jobtopbob/jobtopbob/internal/ai"
)

const defaultOpenAIBaseURL = "https://api.openai.com/v1"

// OpenAIProvider implements ai.Provider using the OpenAI-compatible chat completions API.
// Works with OpenAI, OpenRouter, and any compatible endpoint.
type OpenAIProvider struct {
	baseURL string
	apiKey  string
	model   string
	client  *http.Client
}

// NewOpenAI creates an OpenAI-compatible provider.
func NewOpenAI(cfg ai.ProviderConfig) *OpenAIProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = defaultOpenAIBaseURL
	}

	return &OpenAIProvider{
		baseURL: baseURL,
		apiKey:  cfg.APIKey,
		model:   cfg.Model,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float32       `json:"temperature,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Complete sends a non-streaming completion request and returns the response text.
func (p *OpenAIProvider) Complete(ctx context.Context, req ai.CompletionRequest) (string, error) {
	messages := []chatMessage{}
	if req.SystemPrompt != "" {
		messages = append(messages, chatMessage{Role: "system", Content: req.SystemPrompt})
	}
	messages = append(messages, chatMessage{Role: "user", Content: req.UserPrompt})

	body := chatRequest{
		Model:       p.model,
		Messages:    messages,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("API error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return chatResp.Choices[0].Message.Content, nil
}
