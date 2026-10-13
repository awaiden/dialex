import { DOC_TOPICS } from "./docs.js";

/** The documentation topics offered as `dialex://docs/<topic>` resources. */
export function listDocResources() {
  return {
    resources: Object.keys(DOC_TOPICS).map((topic) => ({
      uri: `dialex://docs/${topic}`,
      name: `Dialex Documentation: ${topic}`,
      mimeType: "text/markdown",
      description: `Reference documentation for Dialex ${topic}`,
    })),
  };
}

/** The content of one `dialex://docs/<topic>` resource. */
export function readDocResource(uri: string) {
  const match = /^dialex:\/\/docs\/([a-zA-Z0-9_-]+)$/.exec(uri);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }
  const topic = match[1];
  const content = DOC_TOPICS[topic];
  if (!content) {
    throw new Error(`Documentation topic not found: ${topic}`);
  }
  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: content,
      },
    ],
  };
}
