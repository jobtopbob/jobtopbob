package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"

	"golang.org/x/crypto/hkdf"
)

// ParseMasterKey decodes a hex-encoded 32-byte encryption key.
func ParseMasterKey(hexKey string) ([]byte, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("invalid hex key: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("key must be 32 bytes, got %d", len(key))
	}
	return key, nil
}

// Encrypt encrypts plaintext using AES-256-GCM with a per-user key derived via HKDF.
// Returns a base64-encoded string containing the nonce prepended to the ciphertext.
func Encrypt(masterKey []byte, userID string, plaintext string) (string, error) {
	derivedKey, err := deriveKey(masterKey, userID)
	if err != nil {
		return "", fmt.Errorf("derive key: %w", err)
	}

	block, err := aes.NewCipher(derivedKey)
	if err != nil {
		return "", fmt.Errorf("new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("new gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt reverses Encrypt — decodes base64, splits nonce from ciphertext, and decrypts.
func Decrypt(masterKey []byte, userID string, encoded string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}

	derivedKey, err := deriveKey(masterKey, userID)
	if err != nil {
		return "", fmt.Errorf("derive key: %w", err)
	}

	block, err := aes.NewCipher(derivedKey)
	if err != nil {
		return "", fmt.Errorf("new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("new gcm: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}

	return string(plaintext), nil
}

// deriveKey uses HKDF-SHA256 to derive a 32-byte AES key from the master key and user ID.
func deriveKey(masterKey []byte, userID string) ([]byte, error) {
	r := hkdf.New(sha256.New, masterKey, []byte(userID), nil)
	key := make([]byte, 32)
	if _, err := io.ReadFull(r, key); err != nil {
		return nil, err
	}
	return key, nil
}
