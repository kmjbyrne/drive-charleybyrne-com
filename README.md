# Storage

A self-hosted file storage application built with Nuxt 4 and Nuxt UI v4.

## Setup

Make sure to install the dependencies:

```bash
npm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

## Deployment

The application is containerised and deployed to an ARM64 host via a private
Docker registry. The build machine is x86_64 (Intel), so the image must be
cross-compiled for the target architecture.

### Prerequisites

A private Docker registry must be running and reachable from both the build
machine and the deployment host. The registry in
`Development/server/docker-nginx` runs behind nginx with mTLS client certificate
authentication at `registry.charleybyrne.com`. Docker client certificates must
be installed at `/etc/docker/certs.d/registry.charleybyrne.com/` on any machine
that needs to push or pull images.

### Build and Push (Intel build machine)

Use Docker Buildx to cross-compile for ARM64 and push directly to the registry
in one step:

```bash
# Create a builder that supports multi-platform builds (one-time setup)
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

# Build for ARM64 and push to the registry
docker buildx build \
  --platform linux/arm64 \
  -t registry.charleybyrne.com/storage:latest \
  --push .
```

### Run on Deployment Host (ARM64)

SSH into the deployment host and log in to the registry:

```bash
docker login registry.charleybyrne.com
```

There are two ways to run the container on the deployment host.

#### Option A — Docker Compose

Copy `docker-compose.yml` and your `.env.local` to the deployment host. The
registry is hardcoded in the compose file so no extra variables are needed:

```bash
docker compose up -d
```

To update, pull the new image and recreate:

```bash
docker compose pull
docker compose up -d
```

#### Option B — Docker Run

Run the container directly without a compose file. The application needs a
persistent volume for its data directory and environment variables from your
`.env.local` file:

```bash
docker pull registry.charleybyrne.com/storage:latest
docker run -d \
  --name storage \
  --restart unless-stopped \
  --env-file .env.local \
  -e NODE_ENV=production \
  -v ./data:/app/data \
  -p 8010:8010 \
  registry.charleybyrne.com/storage:latest
```

To update to a newer build, pull the latest image and recreate the container:

```bash
docker pull registry.charleybyrne.com/storage:latest
docker stop storage && docker rm storage
docker run -d \
  --name storage \
  --restart unless-stopped \
  --env-file .env.local \
  -e NODE_ENV=production \
  -v ./data:/app/data \
  -p 8010:8010 \
  registry.charleybyrne.com/storage:latest
```
