import * as cheerio from 'cheerio';
import { getFilename, getPath } from './pathUtils.js';

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
      if (src && isLocalUrl(baseUrl, srcUrl)) {
        return isCanonical(element) ? { url: srcUrl, type: 'page' } : { url: srcUrl, type: 'file' };
      }

      return null;
    })
    .toArray()
    .filter((srcUrl) => srcUrl));
};

const replaceLocalUrls = (html, baseUrl, outputPath) => {
  const $ = cheerio.load(html);

  tagsAndAttrs.forEach(([tag, attr]) => {
    $(tag)
      .each((_i, el) => {
        const element = $(el);
        const src = element.attr(attr);
        const srcUrl = new URL(src, baseUrl);
        if (src && isLocalUrl(srcUrl, baseUrl)) {
          const filename = isCanonical(element) ? getFilename(srcUrl, 'page') : getFilename(srcUrl, 'file');
          const localPath = getPath(outputPath, filename);
          element.attr(attr, localPath);
        }
      });
  });

  return $.html();
};

export {
  replaceLocalUrls,
  extractLocalUrls,
};
