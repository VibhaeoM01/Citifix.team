const { lookup } = require('dns-lookup-cache');

module.exports = (domain, options) => {
  const promise = new Promise((resolve, reject) => {
    lookup(
      domain,
      options,
      (error, address, family) => {
        if (error) {
          return reject(error);
        }

        return resolve({ address, family });
      },
    );
  });

  return promise;
};
