import axios from 'axios';
import fs from 'fs/promises';
import * as path from 'path';

const buildFilename = (url) => {
  const urlWithoutProtocol = url.replace(/https?:\/\//, '');
  const filename = urlWithoutProtocol.replace(/[^a-z0-9]/gi, '-');
  return `${filename}.html`;
};

export default (url, dir) => axios.get(url)
  .catch((error) => {
    throw new Error(`${error.message}!`);
  })
  .then((response) => {
    const filepath = path.join(dir, buildFilename(url));
    const { data } = response;
    return fs.writeFile(filepath, data).then(() => filepath);
  });
