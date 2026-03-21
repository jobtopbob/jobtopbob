package storage

// Config holds S3-compatible storage configuration.
type Config struct {
	Bucket    string
	Region    string
	Endpoint  string // e.g. "http://localhost:9000" for RustFS/MinIO, empty for AWS S3
	AccessKey string
	SecretKey string
	UseSSL    bool
}
