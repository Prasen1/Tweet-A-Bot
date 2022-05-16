import https from 'https';

// Makes a get request and fetches the location property from headers once redirected from t.co url
// This gives the actual test url provided by user
async function deShortenUrl(twitterUrl) {
  return new Promise(function (resolve, reject) {
    const req = https.request(twitterUrl, res => {
      console.log(`statusCode: ${res.statusCode}`);
      console.log(`Actual Test URL: ${res.headers.location}`);
      let deShortenedUrl = res.headers.location;
      resolve(deShortenedUrl);
    });

    req.on('error', error => {
      console.error(error);
      reject(error);
    });
    req.end();
  })
}

export { deShortenUrl };