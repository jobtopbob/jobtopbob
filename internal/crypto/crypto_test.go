package crypto

import (
	"encoding/hex"
	"testing"
)

func TestParseMasterKey(t *testing.T) {
	// Valid 32-byte key
	key := make([]byte, 32)
	hexKey := hex.EncodeToString(key)
	parsed, err := ParseMasterKey(hexKey)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(parsed) != 32 {
		t.Fatalf("expected 32 bytes, got %d", len(parsed))
	}

	// Invalid hex
	if _, err := ParseMasterKey("not-hex"); err == nil {
		t.Fatal("expected error for invalid hex")
	}

	// Wrong length
	if _, err := ParseMasterKey(hex.EncodeToString(make([]byte, 16))); err == nil {
		t.Fatal("expected error for wrong key length")
	}
}

func TestEncryptDecryptRoundtrip(t *testing.T) {
	masterKey := make([]byte, 32)
	for i := range masterKey {
		masterKey[i] = byte(i)
	}

	userID := "user-123"
	plaintext := "my-secret-oauth-token"

	encrypted, err := Encrypt(masterKey, userID, plaintext)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	if encrypted == plaintext {
		t.Fatal("encrypted text should differ from plaintext")
	}

	decrypted, err := Decrypt(masterKey, userID, encrypted)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}

	if decrypted != plaintext {
		t.Fatalf("expected %q, got %q", plaintext, decrypted)
	}
}

func TestDecryptWrongUser(t *testing.T) {
	masterKey := make([]byte, 32)
	for i := range masterKey {
		masterKey[i] = byte(i)
	}

	encrypted, err := Encrypt(masterKey, "user-1", "secret")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	// Decrypting with a different user ID should fail
	if _, err := Decrypt(masterKey, "user-2", encrypted); err == nil {
		t.Fatal("expected error when decrypting with wrong user ID")
	}
}

func TestDecryptWrongKey(t *testing.T) {
	key1 := make([]byte, 32)
	key2 := make([]byte, 32)
	key2[0] = 1 // Different key

	encrypted, err := Encrypt(key1, "user-1", "secret")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	if _, err := Decrypt(key2, "user-1", encrypted); err == nil {
		t.Fatal("expected error when decrypting with wrong master key")
	}
}
