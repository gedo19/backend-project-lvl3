import * as path from 'path';

export const getPath = (outputPath, filename) => path.join(outputPath, filename);

const prettifyFilename = (filepath) => filepath
  .replace(/\/$/, '')
  .replace(/\.html$/, '')
  .replace(/[^a-z\d]/gi, '-');

const mapping = {
  page: (filename) => `${prettifyFilename(filename)}.html`,
  file: (filename) => {
    const { dir, ext, name } = path.parse(filename);
    const fileWithoutExtname = path.join(dir, name);

    return `${prettifyFilename(fileWithoutExtname)}${ext}`;
  },
  folder: (filename) => `${prettifyFilename(filename)}_files`,
};

export const getFilename = (url, type) => {
  const { hostname, pathname } = url;
  const rawFilename = path.join(hostname, pathname);

  return mapping[type](rawFilename);
};
