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
  files: (outputPath, url) => {
    const filepath = path.join(outputPath, getNameByUrl(url));
    return `${filepath}_files`;
  },
  img: (outputPath, url) => {
    const { dir, ext, name } = path.parse(url.href);
    const urlWithoutExtname = new URL(path.join(dir, name));
    const filepath = path.join(outputPath, getNameByUrl(urlWithoutExtname));
    return `${filepath}${ext || '.png'}`;
  },
  html: (outputPath, url) => {
    const filepath = path.join(outputPath, getNameByUrl(url));
    return `${filepath}.html`;
  },
};

const vars = {};

export default (url, outputPath) => axios.get(url)
  .catch((e) => {
    throw new Error(e.message);
  })
  .then(({ data }) => {
    vars.url = new URL(url);
    vars.data = data;
    vars.filesDirpath = getFilepath.files(outputPath, vars.url);
    vars.filesRelDirpath = getFilepath.files('', vars.url);

    return fs.mkdir(vars.filesDirpath);
  })
  .then(() => {
    const promises = [];
    const $ = cheerio.load(vars.data);
    $('img')
      // eslint-disable-next-line func-names
      .each(function () {
        const src = $(this).attr('src');
        const imgUrl = new URL(src, vars.url);
        if (imgUrl.host === vars.url.host) {
          const filepath = getFilepath.img(vars.filesDirpath, imgUrl);
          const relFilepath = getFilepath.img(vars.filesRelDirpath, imgUrl);

          const promise = axios({
            method: 'get',
            url: imgUrl.href,
            responseType: 'arraybuffer',
          }).then(({ data }) => {
            $(this).attr('src', relFilepath);
            return fs.writeFile(filepath, data);
          });
          promises.push(promise);
        }
      });
    return Promise.all(promises).then(() => $.html());
  })
  .then((html) => {
    const filepath = getFilepath.html(outputPath, vars.url);
    return fs.writeFile(filepath, prettier.format(html, { parser: 'html' })).then(() => filepath);
  });
