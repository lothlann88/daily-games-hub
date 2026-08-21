FROM alpine:3.22

ARG PB_VERSION=0.39.11
# sha256 of pocketbase_${PB_VERSION}_linux_amd64.zip — update when bumping the
# version (curl -sL <url> | sha256sum). Guards against a re-tagged release or
# a build-time MITM.
ARG PB_SHA256=08b9fcda0d5fd42cb315dc15a36dfa121c993855bd635f01d347c31b4328ec34

RUN apk add --no-cache ca-certificates unzip wget tzdata \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && echo "${PB_SHA256}  pocketbase_${PB_VERSION}_linux_amd64.zip" | sha256sum -c - \
    && unzip pocketbase_*.zip -d /pb \
    && rm pocketbase_*.zip \
    && apk del unzip

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
