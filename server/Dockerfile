FROM alpine:3.22

ARG PB_VERSION=0.39.10
# sha256 of pocketbase_${PB_VERSION}_linux_amd64.zip — update when bumping the
# version (curl -sL <url> | sha256sum). Guards against a re-tagged release or
# a build-time MITM.
ARG PB_SHA256=67f68c8041dbb6a35fd7af5997ffc5063a7a7b96bf9df810360788f9e9975408

RUN apk add --no-cache ca-certificates unzip wget tzdata \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && echo "${PB_SHA256}  pocketbase_${PB_VERSION}_linux_amd64.zip" | sha256sum -c - \
    && unzip pocketbase_*.zip -d /pb \
    && rm pocketbase_*.zip \
    && apk del unzip

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
