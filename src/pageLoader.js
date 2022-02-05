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
    if (error.response) {
      throw new Error(`Fail! Server responded with a status code ${error.response.status}`);
    }

    if (error.request) {
      throw new Error('Fail! The request was made but no response was received!');
    }

    throw new Error(`Fail! ${error.message}!`);
  })
  .then((response) => response.data)
  .then((data) => {
    const filepath = path.join(dir, buildFilename(url));
    return fs.writeFile(filepath, data).then(() => filepath);
  });
