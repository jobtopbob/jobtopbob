# ---------- Stage 1: Build ----------
FROM golang:1.26-alpine AS builder
WORKDIR /src

RUN apk add --no-cache git

# Copy Go workspace files
COPY go.work go.work.sum ./
COPY apps/api/go.mod apps/api/go.sum apps/api/
COPY apps/worker/go.mod apps/worker/go.sum apps/worker/
COPY internal/go.mod internal/go.sum internal/

RUN cd apps/worker && go mod download

# Copy source
COPY apps/worker/ apps/worker/
COPY internal/ internal/

RUN cd apps/worker && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/worker ./cmd/worker

# ---------- Stage 2: Runtime ----------
FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates curl postgresql16-client \
    && addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /backups && chown appuser:appgroup /backups

COPY --from=builder /bin/worker /app/worker

USER appuser

CMD ["/app/worker"]
