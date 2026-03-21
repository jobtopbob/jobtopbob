package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Client wraps an S3-compatible object storage client.
type Client struct {
	s3       *s3.Client
	bucket   string
	endpoint string
}

// New creates a storage client and ensures the bucket exists.
func New(ctx context.Context, cfg Config) (*Client, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.Region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
			o.UsePathStyle = true // Required for RustFS/MinIO
		}
	})

	c := &Client{
		s3:       s3Client,
		bucket:   cfg.Bucket,
		endpoint: cfg.Endpoint,
	}

	// Ensure bucket exists
	if err := c.ensureBucket(ctx); err != nil {
		return nil, err
	}

	return c, nil
}

func (c *Client) ensureBucket(ctx context.Context) error {
	_, err := c.s3.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(c.bucket),
	})
	if err == nil {
		return nil // bucket exists
	}

	_, err = c.s3.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(c.bucket),
	})
	if err != nil {
		return fmt.Errorf("create bucket: %w", err)
	}

	// Set bucket policy to allow public read (for serving logos via direct URL)
	policy := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [{
			"Effect": "Allow",
			"Principal": {"AWS": ["*"]},
			"Action": ["s3:GetObject"],
			"Resource": ["arn:aws:s3:::%s/*"]
		}]
	}`, c.bucket)
	_, err = c.s3.PutBucketPolicy(ctx, &s3.PutBucketPolicyInput{
		Bucket: aws.String(c.bucket),
		Policy: aws.String(policy),
	})
	if err != nil {
		return fmt.Errorf("set bucket policy: %w", err)
	}

	return nil
}

// Upload stores an object and returns its public URL.
func (c *Client) Upload(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	_, err := c.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        data,
		ContentType: aws.String(contentType),
		ACL:         types.ObjectCannedACLPublicRead,
	})
	if err != nil {
		return "", fmt.Errorf("upload %s: %w", key, err)
	}
	return c.URL(key), nil
}

// Delete removes an object from the bucket.
func (c *Client) Delete(ctx context.Context, key string) error {
	_, err := c.s3.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}

// URL returns the public URL for an object.
func (c *Client) URL(key string) string {
	if c.endpoint != "" {
		return fmt.Sprintf("%s/%s/%s", c.endpoint, c.bucket, key)
	}
	return fmt.Sprintf("https://%s.s3.amazonaws.com/%s", c.bucket, key)
}

// Bucket returns the configured bucket name.
func (c *Client) Bucket() string {
	return c.bucket
}
