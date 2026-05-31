# bin

## docker-build

Builds the application as an arm64 Docker image and pushes it to the private
registry at `registry.charleybyrne.com/storage`.

This is designed to run on an Intel/amd64 development machine, using
`docker buildx` to cross-compile for arm64 (Raspberry Pi). The image is pushed
directly to the registry so it can be pulled from the Pi without needing to
manually transfer files.

```sh
bin/docker-build           # builds and pushes as :latest
bin/docker-build v1.0.0    # builds and pushes as :v1.0.0
```

On the Raspberry Pi, pull and run the image with:

```sh
docker pull registry.charleybyrne.com/storage:latest
docker compose up -d
```
