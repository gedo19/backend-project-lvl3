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
const getFilepath = (dirpath, filename) => path.join(dirpath, 'ru-hexlet-io-courses_files', filename);
const getPath = (outputPath, filename) => path.join(outputPath, filename);

let outputPath;
beforeEach(async () => {
  outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

let expectedValues;
let html;
beforeAll(async () => {
  html = await fs.readFile(getFixturePath('before.html'), 'utf-8');
  expectedValues = {
    html: await fs.readFile(getFixturePath('after.html'), 'utf-8'),
    png: await fs.readFile(getFixturePath('assets/nodejs.png')),
    css: await fs.readFile(getFixturePath('assets/style.css')),
    script: await fs.readFile(getFixturePath('assets/script.js')),
    canonicalHtml: await fs.readFile(getFixturePath('assets/canonicalPage.html')),
  };
});

test('page loader', async () => {
  nock(/ru\.hexlet\.io/)
    .get('/courses')
    .reply(200, html)
    .get(/assets\/professions\/nodejs\.png/)
    .reply(200, expectedValues.png)
    .get(/assets\/application\.css/)
    .reply(200, expectedValues.css)
    .get(/packs\/js\/runtime\.js/)
    .reply(200, expectedValues.script)
    .get('/courses')
    .reply(200, expectedValues.canonicalHtml);

  const pagePath = await pageLoader(' https://ru.hexlet.io/courses', outputPath);
  const actualHtml = await fs.readFile(pagePath, 'utf-8');
  const actualPng = await fs.readFile(getFilepath(outputPath, 'ru-hexlet-io-assets-professions-nodejs.png'));
  const actualCss = await fs.readFile(getFilepath(outputPath, 'ru-hexlet-io-assets-application.css'));
  const actualScript = await fs.readFile(getFilepath(outputPath, 'ru-hexlet-io-packs-js-runtime.js'));
  const actualCanonical = await fs.readFile(getFilepath(outputPath, 'ru-hexlet-io-courses.html'));

  expect(pagePath).toBe(getPath(outputPath, 'ru-hexlet-io-courses.html'));
  expect(actualHtml).toBe(expectedValues.html);
  expect(actualPng).toEqual(expectedValues.png);
  expect(actualCss).toEqual(expectedValues.css);
  expect(actualScript).toEqual(expectedValues.script);
  expect(actualCanonical).toEqual(expectedValues.canonicalHtml);
});

describe('Should trow errors', () => {
  test('Http errors', async () => {
    nock(/wrong\.url\.wrong/)
      .get(/no-response/)
      .replyWithError('Wrong url!')
      .get(/404/)
      .reply(404)
      .get(/500/)
      .reply(500);

    expect.assertions(3);
    await expect(pageLoader('https://wrong.url.wrong/no-response', outputPath)).rejects.toThrow('The request was made at https://wrong.url.wrong/no-response but no response was received');
    await expect(pageLoader('https://wrong.url.wrong/404', outputPath)).rejects.toThrow('Error requesting https://wrong.url.wrong/404 with status code 404');
    await expect(pageLoader('https://wrong.url.wrong/500', outputPath)).rejects.toThrow('Error requesting https://wrong.url.wrong/500 with status code 500');
  });

  test('Fs errors', async () => {
    nock(/example.com/)
      .get('/')
      .twice()
      .reply(200);
    expect.assertions(2);

    await expect(pageLoader('https://example.com', '/sys')).rejects.toThrow('EACCES: permission denied, mkdir \'/sys/example-com_files\'');
    await expect(pageLoader('https://example.com', '/notExistingFolder')).rejects.toThrow('ENOENT: no such file or directory, mkdir \'/notExistingFolder/example-com_files\'');
  });
});
