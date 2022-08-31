'use strict';

const Nife        = require('nife');
const HTMLParser  = require('htmlparser2');
const renderHTML  = require('dom-serializer').default;

class GeneratorBase {
  constructor(_options) {
    let options = Object.assign(
      {},
      _options || {},
    );

    if (!options.languageGenerator)
      throw new TypeError('"languageGenerator" is a required parameter.');

    Object.defineProperties(this, {
      'options': {
        writable:     true,
        enumberable:  false,
        configurable: true,
        value:        options,
      },
    });

    options.languageGenerator.setGenerator(this);
  }

  getOptions() {
    return this.options;
  }

  getLanguageGenerator() {
    let options = this.getOptions();
    return options.languageGenerator;
  }

  getArtifacts() {
    let options = this.getOptions();
    return options.artifacts;
  }

  buildArtifactID(artifact) {
    let parts = [];

    if (artifact.type === 'ClassDeclaration') {
      parts.push('class');
      parts.push(artifact.name);
    } else if (artifact.type === 'FunctionDeclaration') {
      if (artifact.parentClass)
        parts.push('method');
      else
        parts.push('function');

      parts.push(artifact.name);
    } else if (artifact.type === 'PropertyDeclaration') {
      parts.push('property');
      parts.push(artifact.name);
    }

    return parts.join('-').replace(/[^\w_-]/g, '-');
  }

  getPageNameFromArtifact(artifact) {
    const formatScopeName = (name) => {
      if (!name)
        return name;

      return name.replace(/[^\w _-]/g, '-');
    };

    const getArtifactScopeName = (artifact) => {
      return Nife.get(artifact, 'comment.definition.docScope', 'global');
    };

    if (artifact.type === 'Page')
      return formatScopeName(`page-${artifact.name}`);

    if (artifact.type === 'ClassDeclaration')
      return formatScopeName(`class-${artifact.name}`);

    return formatScopeName(getArtifactScopeName(artifact));
  }

  getPageName(page) {
    if (page.alias)
      return page.alias.replace(/^\w+-/, '');

    if (page.type === 'page')
      return page.name.replace(/^\w+-/, '');

    if (page.type === 'namespace')
      return page.name;

    return page.artifactName || page.name;
  }

  buildPageURL(page, options) {
    let baseURL = Nife.get(options, 'generatorOptions.baseURL', '.');
    return (`${baseURL}/${page.fileName}`).replace(/\/+/g, '/');
  }

  buildArtifactURL(page, artifact, options) {
    let baseURL     = Nife.get(options, 'generatorOptions.baseURL', '.');
    let artifactID  = this.buildArtifactID(artifact);

    return (`${baseURL}/${page.fileName}#${artifactID}`).replace(/\/+/g, '/');
  }

  pageNameToFileName(pageName) {
    return pageName.replace(/[^\w_-]/g, '');
  }

  groupArtifactsIntoPages(artifacts, options) {
    const createPageFromArtifact = (pageName, artifact) => {
      let page = {
        artifact:     artifact,
        artifactName: artifact.name,
        name:         pageName,
        type:         'class',
        artifacts:    [],
      };

      if (artifact.type === 'Page')
        page.type = 'page';
      else if (artifact.type === 'ClassDeclaration')
        page.type = 'class';
      else
        page.type = 'namespace';

      page.fileName = this.pageNameToFileName(this.getPageName(page));

      return page;
    };

    let pages = {};

    for (let i = 0, il = artifacts.length; i < il; i++) {
      let artifact    = artifacts[i];
      let pageName    = this.getPageNameFromArtifact(artifact);
      let currentPage = pages[pageName];

      if (!currentPage)
        currentPage = pages[pageName] = createPageFromArtifact(pageName, artifact);

      let aliases = Nife.get(artifact, 'comment.definition.aliases');
      if (aliases) {
        for (let j = 0, jl = aliases.length; j < jl; j++) {
          let alias = aliases[j];
          pages[`alias-${alias}`] = Object.assign({}, currentPage, { alias, originalPageName: pageName  });
        }
      }

      currentPage.artifacts.push(artifact);
    }

    return pages;
  }

  sortArtifacts(artifacts) {
    return artifacts.sort((a, b) => {
      let x = ('' + a.name).toLowerCase();
      let y = ('' + b.name).toLowerCase();

      if (x === y)
        return 0;

      return (x < y) ? -1 : 1;
    });
  }

  parseAndGenerateDescription(_description, context) {
    let tags = [];

    const subContentTag = (value) => {
      tags.push(value);
      return `@@@@@BLIBLO_TAG[${tags.length - 1}]@@@@@`;
    };

    const unsubContentTag = (value, _index) => {
      let index = parseInt(_index, 10);
      return tags[index];
    };

    const filterTags = (node, finalContent) => {
      if (!node)
        return node;

      if (node.type === 'text') {
        finalContent.push(node.data);
        return node;
      }

      if (node.type === 'tag' && node.name === 'see') {
        let reference = Nife.get(node, 'children[0].data');
        if (reference) {
          let link = this.buildReferenceLink(reference.trim(), { ...context, nameOverride: node.attribs.name });
          if (!link)
            link = reference; // Just fallback to the text

          return {
            parent:     node.parent,
            prev:       node.prev,
            next:       node.next,
            startIndex: node.startIndex,
            endIndex:   node.endIndex,
            data:       link,
            type:       'text',
          };
        }

        return null;
      }

      let children = node.children;
      if (children && children.length) {
        node.children = children.map((childNode) => {
          if (childNode.type === 'text')
            return childNode;

          return filterTags(childNode);
        }).filter(Boolean);
      }

      return node;
    };

    if (!_description)
      return '';

    let description = _description.trim();
    let DOM         = HTMLParser.parseDocument(description.replace(/```[\s\S]*?```/g, subContentTag));

    description = renderHTML(filterTags(DOM), { encodeEntities: false }).trim();
    description = description.replace(/@@@@@BLIBLO_TAG\[(\d+)\]@@@@@/g, unsubContentTag);

    return description;
  }

  punctuate(_description, context) {
    let description = this.parseAndGenerateDescription(_description, context);

    if (!(/[!?.`:]$/).test(description))
      return `${description}.`;

    return description;
  }

  findArtifactByReference(pages, reference) {
    let parts     = reference.split(/[:.]+/g).map((part) => part.trim()).filter(Boolean);
    let pageName;

    let prefixes = [ 'namespace', 'class', 'property', 'method', 'alias', null ];
    for (let i = 0, il = prefixes.length; i < il; i++) {
      let prefix = prefixes[i];

      if (prefix)
        pageName = `${prefix}-${parts[0]}`;
      else
        pageName = parts[0];

      if (pages[pageName])
        break;
    }

    let page = pages[pageName];
    if (!page)
      return {};

    let referenceName = parts[1];
    if (!referenceName)
      return { page };

    let artifacts = page.artifacts;
    let artifact  = artifacts.find((artifact) => {
      return (artifact.name === referenceName);
    });

    if (!artifact)
      return {};

    return { page, artifact };
  }

  buildReferenceLink(referenceName, { pages, options, nameOverride }) {
    let { page, artifact } = this.findArtifactByReference(pages, referenceName);
    if (!page && !artifact) {
      console.warn(`Warning: Unable to find "See Also" reference: "${referenceName}"`);
      return (nameOverride) ? nameOverride : referenceName;
    }

    if (!artifact)
      return `[${(nameOverride) ? nameOverride : this.getPageName(page)}](${this.buildPageURL(page, options)})`;
    else
      return `[${(nameOverride) ? nameOverride : `${this.getPageName(page)}.${artifact.name}`}](${this.buildArtifactURL(page, artifact, options)})`;
  }
}

module.exports = GeneratorBase;
