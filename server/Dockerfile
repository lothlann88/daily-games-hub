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

# Run unprivileged: PocketBase needs no capabilities (binds 8090, writes only
# the pb_data mount). Fixed UID 8090 — deploy.sh chowns the host pb_data dir
# to match, so keep the two in sync if this ever changes. Same UID as
# grey-tide on purpose: the data dirs are separate, and a novel UID would be
# exactly the kind of drift the playbook retrofit exists to remove.
RUN adduser -D -H -u 8090 pocketbase && chown -R pocketbase /pb
USER pocketbase

EXPOSE 8090

# --origins pins CORS to the public origin (default is *). Bearer-token auth
# means allow-all is not directly exploitable, but there is no reason to
# answer other sites. Same-origin app requests don't involve CORS at all;
# tailnet/dev access is same-origin too (the SPA is served by PocketBase).
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--origins=https://dailygame.handani.dev"]
