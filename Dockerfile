# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
RUN node_modules/.bin/esbuild src/index.ts --bundle --platform=node --outfile=index.js --format=esm
RUN bun build index.js --compile --outfile=markdown2lexical 

# copy production dependencies and source code into final image
FROM oven/bun:distroless AS release
COPY --from=prerelease /usr/src/app/markdown2lexical .
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/src/healthcheck.ts .


HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD [ "bun", "run", "healthcheck.ts" ]
# run the app
EXPOSE 3000/tcp
ENTRYPOINT [ "./markdown2lexical" ]
