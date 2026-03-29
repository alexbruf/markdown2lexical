import { Hono } from "hono";
import { env } from "hono/adapter";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { createHeadlessEditor } from "@lexical/headless";
import {
  defaultEditorConfig,
  getEnabledNodes,
  sanitizeServerEditorConfig,
} from "@payloadcms/richtext-lexical";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

// Workers-compatible logger (replaces pino)
const createLog =
  (level: string, fn: typeof console.log) =>
  (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === "string") {
      fn(JSON.stringify({ level, msg: objOrMsg }));
    } else {
      fn(
        JSON.stringify({
          level,
          ...objOrMsg,
          msg: msg ?? (objOrMsg as { msg?: string }).msg,
        })
      );
    }
  };

const cloudflareLogger = {
  level: "info",
  trace: createLog("trace", console.debug),
  debug: createLog("debug", console.debug),
  info: createLog("info", console.log),
  warn: createLog("warn", console.warn),
  error: createLog("error", console.error),
  fatal: createLog("fatal", console.error),
  silent: () => {},
} as any;

const configPromise = buildConfig({
  editor: lexicalEditor(),
  secret: "fakeSecret",
  db: {} as any,
  admin: {},
  logger: cloudflareLogger,
});

const app = new Hono();

app.get("/health", (c) => {
  return c.text("OK");
});

app.post("/", async (c) => {
  const { API_KEY } = env<{ API_KEY: string }>(c);
  const bearer = c.req.header("Authorization");
  const token = bearer?.split(" ")[1];
  if (token !== API_KEY) {
    return c.text("Unauthorized", 401);
  }

  const body = await c.req.text();
  if (!body) {
    return c.text("Bad Request", 400);
  }

  const yourSanitizedEditorConfig = await sanitizeServerEditorConfig(
    defaultEditorConfig,
    await configPromise,
  );

  const headlessEditor = createHeadlessEditor({
    nodes: getEnabledNodes({
      editorConfig: yourSanitizedEditorConfig,
    }),
  });

  headlessEditor.update(
    () => {
      $convertFromMarkdownString(
        body,
        yourSanitizedEditorConfig.features.markdownTransformers,
      );
    },
    { discrete: true },
  );
  const editorJSON = headlessEditor.getEditorState().toJSON();

  return c.json(editorJSON);
});

export default app;
