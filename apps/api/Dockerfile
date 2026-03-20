# ---------- Stage 1: Build ----------
FROM golang:1.26-alpine AS builder
WORKDIR /src

RUN apk add --no-cache git

# Copy Go workspace files
COPY go.work go.work.sum ./
COPY apps/api/go.mod apps/api/go.sum apps/api/
COPY apps/worker/go.mod apps/worker/go.sum apps/worker/
COPY internal/go.mod internal/go.sum internal/

RUN cd apps/api && go mod download

# Copy source
COPY apps/api/ apps/api/
COPY internal/ internal/

RUN cd apps/api && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/api ./cmd/api

# ---------- Stage 2: Runtime ----------
FROM alpine:3.21
WORKDIR /app

# curl for healthcheck
RUN apk add --no-cache ca-certificates curl \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /bin/api /app/api

USER appuser

EXPOSE 8080

CMD ["/app/api"]
