import { createApi } from "./api.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const server = await createApi({ concurrency: Number(process.env.FORKWISE_WORKER_CONCURRENCY || 1) });
server.listen(port, host, () => {
  console.log(`ForkWise analysis API listening on http://${host}:${port}`);
});
