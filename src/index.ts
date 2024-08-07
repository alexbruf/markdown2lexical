import { Hono } from "hono";
import { env } from "hono/adapter";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { createHeadlessEditor } from "@lexical/headless";
import {
  getEnabledNodes,
  sanitizeEditorConfig,
} from "@payloadcms/richtext-lexical";

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

  const headlessEditor = createHeadlessEditor({
    nodes: getEnabledNodes({
      editorConfig: sanitizeEditorConfig({ features: [] }),
    }) as any,
  });
  headlessEditor.update(
    () => {
      $convertFromMarkdownString(body, TRANSFORMERS);
    },
    { discrete: true },
  );

  // Do this if you then want to get the editor JSON
  const editorJSON = headlessEditor.getEditorState().toJSON();
  return c.json(editorJSON);
});

export default app;
