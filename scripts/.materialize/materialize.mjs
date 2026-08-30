import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const EXPECTED_LENGTH = 91_212;
const EXPECTED_SHA256 = '1c570603141380cd23aceb893b0a19753ae137f04267e711bfe3b67b69f46ea0';
const EXPECTED_FILES = 38;
const root = process.cwd();
const payloadDirectory = path.join(root, 'scripts', '.materialize');

const segmentNames = (await readdir(payloadDirectory))
  .filter((name) => /^part-.*\.txt$/u.test(name))
  .sort((left, right) => left.localeCompare(right));

if (segmentNames.length === 0) {
  throw new Error('No release payload segments were found.');
}

const encoded = (
  await Promise.all(
    segmentNames.map((name) => readFile(path.join(payloadDirectory, name), 'utf8')),
  )
)
  .join('')
  .replace(/\s+/gu, '');

const digest = createHash('sha256').update(encoded, 'utf8').digest('hex');
if (encoded.length !== EXPECTED_LENGTH || digest !== EXPECTED_SHA256) {
  throw new Error(
    `Release payload integrity check failed: length=${encoded.length}, sha256=${digest}`,
  );
}

const manifest = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
const entries = Object.entries(manifest);
if (entries.length !== EXPECTED_FILES) {
  throw new Error(`Expected ${EXPECTED_FILES} release files but received ${entries.length}.`);
}

for (const [relativePath, file] of entries) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.includes('\0') ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/u).includes('..')
  ) {
    throw new Error(`Unsafe release path: ${relativePath}`);
  }

  if (!file || file.encoding !== 'utf8' || typeof file.content !== 'string') {
    throw new Error(`Unsupported release entry: ${relativePath}`);
  }

  const destination = path.resolve(root, relativePath);
  if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Release path escaped repository root: ${relativePath}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, file.content, 'utf8');
}

console.log(
  `Materialized ${entries.length} validated release files from ${segmentNames.length} segments.`,
);
