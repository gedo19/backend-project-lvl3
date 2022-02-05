import nock from 'nock';
import * as os from 'os';
import fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pageLoader from '../src/pageLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFixturePath = (name) => path.join(__dirname, '..', '__fixtures__', name);

let dir;
let html;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

beforeAll(async () => {
  html = await fs.readFile(getFixturePath('example.html'), 'utf-8');
});

test('pageLoader', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/courses/)
    .reply(200, html);

  const filepath = await pageLoader('https://ru.hexlet.io/courses', dir);
  const content = await fs.readFile(filepath, 'utf-8');
  expect(content).toBe(html);
});
