'use strict';

class LanguageGeneratorBase {
  constructor(_options) {
    let options = Object.assign(
      {},
      _options || {},
    );

    Object.defineProperties(this, {
      'options': {
        writable:     true,
        enumberable:  false,
        configurable: true,
        value:        options,
      },
      'generator': {
        writable:     true,
        enumberable:  false,
        configurable: true,
        value:        null,
      },
    });
  }

  getOptions() {
    return this.options;
  }

  getGenerator() {
    return this.generator;
  }

  setGenerator(generator) {
    this.generator = generator;
  }

  onGenerateType(context, type) {
    let generator = this.getGenerator();
    if (generator && typeof generator.onGenerateType === 'function')
      return generator.onGenerateType(context, type);

    return `\`${type}\``;
  }
}

module.exports = LanguageGeneratorBase;
