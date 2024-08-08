import { Hono } from "hono";
import { env } from "hono/adapter";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { createHeadlessEditor } from "@lexical/headless";
import {
  defaultEditorConfig,
  getEnabledNodes,
  sanitizeServerEditorConfig,
} from "@payloadcms/richtext-lexical";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

const configPromise = buildConfig({
  //editor: slateEditor({}),
  editor: lexicalEditor(),
  secret: "fakeSecret",

  db: {} as any,
  // db: mongooseAdapter({
  //   url: process.env.MONGODB_URI || "",
  // }),

  admin: {},
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.

  // This is temporary - we may make an adapter pattern
  // for this before reaching 3.0 stable
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
