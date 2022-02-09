import * as path from 'path';

const prettifyPath = (filepath) => filepath
  .replace(/\/$/, '')
  .replace(/[^a-z\d]/gi, '-');

const makePagename = (url) => {
  const { hostname, pathname } = url;
  const localUrl = path.join(hostname, pathname)
    .replace(/\.html$/, '');

  return `${prettifyPath(localUrl)}.html`;
};

const makeFilename = (url) => {
  const { hostname, pathname } = url;
  const urlWithoutProtocol = path.join(hostname, pathname);
  const { dir, ext, name } = path.parse(urlWithoutProtocol);
  const urlWithoutExtname = path.join(dir, name);

  return `${prettifyPath(urlWithoutExtname)}${ext}`;
};

const makeFoldername = (url) => {
  const { hostname, pathname } = url;
  const urlWithoutProtocol = path.join(hostname, pathname);

  return `${prettifyPath(urlWithoutProtocol)}_files`;
};

export {
  makePagename,
  makeFilename,
  makeFoldername,
};
