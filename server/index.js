import { createApi } from "./api.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const server = await createApi();
server.listen(port, host, () => {
  console.log(`ForkWise request-bound analysis API listening on http://${host}:${port}`);
});
