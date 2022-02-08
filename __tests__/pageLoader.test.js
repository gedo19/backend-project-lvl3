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

test('pageLoader should save html file', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/courses/)
    .reply(200, html);

  const filepath = await pageLoader('https://ru.hexlet.io/courses', dir);
  const content = await fs.readFile(filepath, 'utf-8');

  expect(content).toBe(html);
});

test('when the http request fails', async () => {
  nock(/wrong\.url\.wrong/)
    .get(/what/)
    .replyWithError('Wrong url!');
  expect.assertions(1);

  await expect(pageLoader('https://wrong.url.wrong/what', dir)).rejects.toThrow('Wrong url!');
});

test('pageLoader should save images', async () => {
  const beforeHtml = await fs.readFile(getFixturePath('htmlWithImg_before.html'), 'utf-8');
  const img = await fs.readFile(getFixturePath('node_js.png'));
  nock(/ru\.hexlet\.io/)
    .get(/courses/)
    .reply(200, beforeHtml);
  nock(/ru\.hexlet\.io/)
    .get(/assets\/professions\/nodejs.png/)
    .reply(200, img);

  const afterHtml = await fs.readFile(getFixturePath('htmlWithImg_after.html'), 'utf-8');
  const filepath = await pageLoader('https://ru.hexlet.io/courses', dir);
  const content = await fs.readFile(filepath, 'utf-8');

  expect(content).toBe(afterHtml);
});
