import axios from 'axios';
import fs from 'fs/promises';
import prettier from 'prettier';
import Listr from 'listr';
import debug from 'debug';
import { getFilename, getPath } from './pathUtils.js';
import {
  replaceLocalUrls,
  extractLocalUrls,
} from './pageProcessors.js';

const log = debug('page-loader');

const handleError = (error) => {
  if (error.isAxiosError) {
    if (error.response) {
      throw new Error(`Error requesting ${error.config.url} with status code ${error.response.status}`);
    }
    throw new Error(`The request was made at ${error.config.url} but no response was received`);
  }

  throw error;
};

const loadResources = (urls, outputPath) => {
  const mapping = {
    page: (url, dir) => getPath(dir, getFilename(url, 'page')),
    file: (url, dir) => getPath(dir, getFilename(url, 'file')),
  };
  const tasks = new Listr(
    urls
      .map(({ url, type }) => {
        log(`GET ${url}`);
        const task = axios({
          method: 'get',
          url: url.href,
          responseType: 'arraybuffer',
        })
          .then(({ data }) => {
            const filepath = mapping[type](url, outputPath);
            log(`Saving file: ${filepath}`);
            return fs.writeFile(filepath, data);
          })
          .catch(handleError);

        return { title: url.href, task: () => task };
      }),
    { concurrent: true },
  );

  return tasks.run();
};

export default (url, outputPath = process.cwd()) => {
  const baseUrl = new URL(url);

  let data;
  const resourcesFolderName = getFilename(baseUrl, 'folder');
  const resourcesFolderPath = getPath(outputPath, resourcesFolderName);

  log(`GET ${url}`);
  return axios.get(url)
    .catch(handleError)
    .then((res) => {
      data = res.data;
      log(`Making folder: ${resourcesFolderPath}`);
      return fs.mkdir(resourcesFolderPath).catch(handleError);
    })
    .then(() => {
      log('Extracting local urls.');
      const localUrls = extractLocalUrls(data, baseUrl);

      log('Downloading resources.');
      return loadResources(localUrls, resourcesFolderPath);
    })
    .then(() => {
      const html = replaceLocalUrls(data, baseUrl, resourcesFolderName);
      const prettifiedHtml = prettier.format(html, { parser: 'html' });
      const pageFilepath = getPath(outputPath, getFilename(baseUrl, 'page'));
      log(`Saving file: ${pageFilepath}`);

      return fs.writeFile(pageFilepath, prettifiedHtml).then(() => pageFilepath).catch(handleError);
    });
};
