ARG NODE_IMAGE_VERSION

# Create base image
FROM node:${NODE_IMAGE_VERSION} as base
RUN apk add --no-cache tini python make g++

# Install process engine
FROM base as process_engine

ARG PROCESS_ENGINE_VERSION
# Hack to compromise priviliges error https://github.com/npm/npm/issues/17851
RUN npm config set user 0 &&\
  npm config set unsafe-perm true

RUN npm install -g @process-engine/process_engine_runtime@${PROCESS_ENGINE_VERSION}

# Create release
FROM process_engine as release
EXPOSE 8000
CMD ["process-engine"]

VOLUME [ "/root/.config/process_engine_runtime/" ]
VOLUME [ "/usr/local/lib/node_modules/@process-engine/process_engine_runtime/config/" ]

HEALTHCHECK --interval=5s \
  --timeout=5s \
  CMD curl -f http://127.0.0.1:8000 || exit 1

LABEL de.5minds.version="0.1.0" \
  de.5minds.release-date="2019-01-17" \
  vendor="5Minds IT-Solutions GmbH & Co. KG" \
  maintainer="Robin Lenz"
