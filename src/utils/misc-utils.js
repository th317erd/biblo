'use strict';

async function collectPromises(_promises, options) {
  const colors  = require('../colors')(options);
  let errors    = [];
  let promises  = (await Promise.allSettled(_promises)).map((result) => {
    if (result.status !== 'fulfilled') {
      if (options && options.logger)
        options.logger.error(colors.red(result.reason));

      errors.push(result.reason);
      return;
    }

    return result.value;
  });

  if (errors.length > 0) {
    if (options && options.logger)
      options.logger.log((options && options.errorMessage) ? options.errorMessage : 'collectPromises: There were errors encountered. Aborting.');

    let error = new Error((options && options.errorMessage) ? options.errorMessage : 'collectPromises: There were errors encountered. Aborting.');
    error.errors = errors;

    throw error;
  }

  return promises;
}

async function runMiddleware(type, callback, data, options) {
  const runMiddleware = (middleware, initialResult) => {
    return new Promise((resolve, reject) => {
      const next = async (index, result) => {
        if (index >= middleware.length)
          return result;

        let plugin = middleware[index];
        if (typeof plugin !== 'function')
          return await next(index + 1, result);

        let finalResult;
        let nextCalled = false;
        let returnedResult = await plugin(result, async (result) => {
          nextCalled = true;
          finalResult = next(index + 1, result);
        });

        if (nextCalled)
          return await finalResult;

        return returnedResult;
      };

      next(0, initialResult)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  let result = data;

  if (options && options.middleware && options.middleware[type]) {
    let middleware = options.middleware[type];
    result = await runMiddleware(middleware, result);
  }

  if (typeof callback === 'function')
    result = await runMiddleware([ callback ], result);

  return result;
}

module.exports = {
  collectPromises,
  runMiddleware,
};
