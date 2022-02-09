import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import * as path from 'path';
import prettier from 'prettier';

const getNameByUrl = (url) => {
  const { protocol } = url;
  const regex = new RegExp(`${protocol}//`);
  const urlWithoutProtocol = url.href.replace(regex, '');
  return urlWithoutProtocol
    .replace(/\/$/, '')
    .replace(/[^a-z0-9]/gi, '-');
};

const getFilepath = {
  fileDir: (outputPath, url) => {
    const filepath = path.join(outputPath, getNameByUrl(url));
    return `${filepath}_files`;
  },
  file: (outputPath, url) => {
    const { dir, ext, name } = path.parse(url.href);
    const urlWithoutExtname = new URL(path.join(dir, name));
    const filepath = path.join(outputPath, getNameByUrl(urlWithoutExtname));
    return `${filepath}${ext}`;
  },
  html: (outputPath, url) => {
    const filepath = path.join(outputPath, getNameByUrl(url));
    return `${filepath}.html`;
  },
};

const extractDomainUrls = (html, url, tagsAndAttrs) => {
  const $ = cheerio.load(html);
  const { host } = url;

  return tagsAndAttrs.flatMap(([tag, attr]) => $(tag)
    // eslint-disable-next-line func-names
    .map(function () {
      const src = $(this).attr(attr);
      const srcUrl = new URL(src, url);
      return srcUrl.host === host ? srcUrl : null;
    })
    .toArray()
    .filter((srcUrl) => srcUrl));
};

const downloadFiles = (urls, dir) => {
  const promises = urls
    .map((url) => axios({
      method: 'get',
      url: url.toString(),
      responseType: 'arraybuffer',
    })
      .then(({ data }) => {
        const filepath = getFilepath.file(dir, url);

        return fs.writeFile(filepath, data);
      }));

  return Promise.allSettled(promises);
};

const replaceDomainUrls = (html, url, dir, tagsAndAttrs) => {
  const $ = cheerio.load(html);
  const { host } = url;

  tagsAndAttrs.forEach(([tag, attr]) => {
    $(tag)
      // eslint-disable-next-line func-names
      .each(function () {
        const src = $(this).attr(attr);
        const srcUrl = new URL(src, url);
        if (srcUrl.host === host) {
          $(this).attr(attr, getFilepath.file(dir, srcUrl));
        }
      });
  });

  return $.html();
};

export default (url, outputPath) => {
  const tagsAndAttrs = [
    ['link', 'href'],
    ['script', 'src'],
    ['img', 'src'],
  ];

  const vars = {};

  return axios.get(url)
    .catch((e) => {
      throw new Error(e.message);
    })
    .then(({ data }) => {
      vars.url = new URL(url);
      vars.data = data;
      vars.filesDirpath = getFilepath.fileDir(outputPath, vars.url);
      vars.filesRelDirpath = getFilepath.fileDir('', vars.url);

      return fs.mkdir(vars.filesDirpath);
    })
    .then(() => {
      const domainUrls = extractDomainUrls(vars.data, vars.url, tagsAndAttrs);

      return downloadFiles(domainUrls, vars.filesDirpath);
    })
    .then(() => {
      const html = replaceDomainUrls(vars.data, vars.url, vars.filesRelDirpath, tagsAndAttrs);
      const prettifiedHtml = prettier.format(html, { parser: 'html' });
      const filepath = getFilepath.html(outputPath, vars.url);

      return fs.writeFile(filepath, prettifiedHtml).then(() => filepath);
    });
};
