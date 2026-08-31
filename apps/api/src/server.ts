import path from "node:path";

import { createApp, defaultDataDirectory } from "./app.js";
import { IdentityDirectory } from "./domain/identity.js";
import { FileAccessRequestRepository } from "./repositories/file-access-request-repository.js";

const parsedPort = Number.parseInt(process.env.PORT ?? "4000", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4000;
const dataDirectory = process.env.DATA_DIR ?? defaultDataDirectory();

const app = createApp({
  repository: new FileAccessRequestRepository(
    path.join(dataDirectory, "requests.json"),
  ),
  directory: new IdentityDirectory(path.join(dataDirectory, "identities.json")),
});

app.listen(port, () => {
  console.log(`EntitleGraph API listening on port ${port}`);
  console.log(`Persisting to ${dataDirectory}`);
});
