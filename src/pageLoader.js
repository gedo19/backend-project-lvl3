import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import * as path from 'path';
import prettier from 'prettier';
// import debug from 'debug';
// import axiosDebugLog from 'axios-debug-log';
import {
  makeFilename,
  makePagename,
  makeFoldername,
} from './localnameMakers.js';

const isLocalUrl = (url, localUrl) => url.host === localUrl.host;
const isCanonical = (tag) => tag.attr('rel') === 'canonical';

const tagsAndAttrs = [
  ['img', 'src'],
  ['script', 'src'],
  ['link', 'href'],
];

const extractLocalUrls = (html, baseUrl) => {
  const $ = cheerio.load(html);

  return tagsAndAttrs.flatMap(([tag, attr]) => $(tag)
    .map((_i, el) => {
      const element = $(el);
      const src = element.attr(attr);
      const srcUrl = new URL(src, baseUrl);
      if (isLocalUrl(baseUrl, srcUrl)) {
        return isCanonical(element) ? { url: srcUrl, type: 'page' } : { url: srcUrl, type: 'file' };
      }

      return null;
    })
    .toArray()
    .filter((srcUrl) => srcUrl));
};

const loadFiles = (urls, outputPath) => {
  const mapping = {
    page: (url, dir) => path.join(dir, makePagename(url)),
    file: (url, dir) => path.join(dir, makeFilename(url)),
  };

  const promises = urls
    .map(({ url, type }) => axios({
      method: 'get',
      url: url.toString(),
      responseType: 'arraybuffer',
    })
      .then(({ data }) => {
        const filepath = mapping[type](url, outputPath);

        return fs.writeFile(filepath, data);
      }));

  return Promise.all(promises);
};

const replaceDomainUrls = (html, baseUrl, outputPath) => {
  const $ = cheerio.load(html);

  tagsAndAttrs.forEach(([tag, attr]) => {
    $(tag)
      .each((_i, el) => {
        const element = $(el);
        const src = element.attr(attr);
        const srcUrl = new URL(src, baseUrl);
        if (isLocalUrl(srcUrl, baseUrl)) {
          const filename = isCanonical(element) ? makePagename(srcUrl) : makeFilename(srcUrl);
          element.attr(attr, path.join(outputPath, filename));
        }
      });
  });

  return $.html();
};

export default (url, outputPath) => {
  const baseUrl = new URL(url);
  let html;
  const htmlFilename = makePagename(baseUrl);
  const htmlFilepath = path.join(outputPath, htmlFilename);
  const filesFoldername = makeFoldername(baseUrl);
  const filesFolderpath = path.join(outputPath, filesFoldername);

  return axios.get(url)
    .catch((e) => {
      throw new Error(e.message);
    })
    .then(({ data }) => {
      html = data;

      return fs.mkdir(filesFolderpath);
    })
    .then(() => {
      const localUrls = extractLocalUrls(html, baseUrl);

      return loadFiles(localUrls, filesFolderpath);
    })
    .then(() => {
      const dom = replaceDomainUrls(html, baseUrl, filesFoldername);
      const prettifiedHtml = prettier.format(dom, { parser: 'html' });
      return fs.writeFile(htmlFilepath, prettifiedHtml).then(() => htmlFilepath);
    });
};
