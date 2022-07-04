'use strict';

const Nife        = require('nife');
const Path        = require('path');
const FileSystem  = require('fs');

const TypescriptLanguageGenerator = require('../../language/typescript');

function buildArtifactID(artifact) {
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

function buildPageURL(page, options) {
  let baseURL = Nife.get(options, 'generatorOptions.baseURL', '.');
  return (`${baseURL}/${page.fileName}`).replace(/\/+/g, '/');
}

function buildArtifactURL(page, artifact, options) {
  let baseURL     = Nife.get(options, 'generatorOptions.baseURL', '.');
  let artifactID  = buildArtifactID(artifact);

  return (`${baseURL}/${page.fileName}#${artifactID}`).replace(/\/+/g, '/');
}

function getPageNameFromArtifact(artifact) {
  const getArtifactScopeName = (artifact) => {
    return Nife.get(artifact, 'comment.definition.docScope', 'global');
  };

  if (artifact.type === 'ClassDeclaration')
    return artifact.name;

  return getArtifactScopeName(artifact);
}

function pageNameToFileName(pageName) {
  return pageName.replace(/[^\w_-]/g, '');
}

function groupArtifactsIntoPages(artifacts, options) {
  const createPageFromArtifact = (pageName, artifact) => {
    let page = {
      name:       pageName,
      fileName:   pageNameToFileName(pageName),
      type:       'class',
      artifacts:  [],
    };

    if (artifact.type === 'ClassDeclaration')
      page.type = 'class';
    else
      page.type = 'namespace';

    return page;
  };

  let pages = {};

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact    = artifacts[i];
    let pageName    = getPageNameFromArtifact(artifact);
    let currentPage = pages[pageName];

    if (!currentPage)
      currentPage = pages[pageName] = createPageFromArtifact(pageName, artifact);

    currentPage.artifacts.push(artifact);
  }

  return pages;
}

function sortArtifacts(artifacts) {
  return artifacts.sort((a, b) => {
    let x = ('' + a.name).toLowerCase();
    let y = ('' + b.name).toLowerCase();

    if (x === y)
      return 0;

    return (x < y) ? -1 : 1;
  });
}

function hasArguments(artifact) {
  let args = Nife.get(artifact, 'comment.definition.arguments');
  if (Nife.isEmpty(args))
    args = artifact.arguments;

  if (Nife.isEmpty(args))
    return false;

  return true;
}

function iterateArguments(artifact, callback) {
  let args = Nife.get(artifact, 'comment.definition.arguments');
  if (Nife.isEmpty(args))
    args = artifact.arguments;

  if (Nife.isEmpty(args))
    return;

  for (let i = 0, il = args.length; i < il; i++) {
    let arg = args[i];
    callback(arg, i);
  }
}

function punctuate(_description) {
  if (!_description)
    return '';

  let description = _description.trim();

  if (!(/[!?.]$/).test(description))
    return `${description}.`;

  return description;
}

function generatePage(languageGenerator, page, sidebarContent, options) {
  let artifacts     = page.artifacts;
  let content       = [];
  let sidebarItems  = [];

  artifacts = sortArtifacts(artifacts);

  sidebarItems.push(`* [${page.name}](${buildPageURL(page, options)})`);

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    let comment = artifact.comment;

    if (!comment)
      continue;

    sidebarItems.push(`  * [${artifact.name}](${buildArtifactURL(page, artifact, options)})`);

    content.push(`#### <a name="${buildArtifactID(artifact)}"></a>${languageGenerator.generateSignature(artifact)}\n`);

    let description = punctuate(languageGenerator.generateDescription(artifact)).replace(/\n/g, '\n> ');
    content.push(`> ${description}\n`);

    if (hasArguments(artifact)) {
      content.push('>\n> Arguments:\n');
      iterateArguments(artifact, (arg) => {
        let signature = languageGenerator.generateSignature(arg);
        content.push(`>   * ${signature}\n`);

        let description = arg.description;
        if (Nife.isNotEmpty(description))
          content.push(`>      > ${punctuate(description).replace(/\n/g, '\n>      > ')}\n`);
      });
    }

    let returnType = Nife.get(artifact, 'comment.definition.return');
    if (Nife.isEmpty(returnType))
      returnType = artifact['return'];

    if (Nife.isNotEmpty(returnType)) {
      let typeStr = languageGenerator.generateTypes(returnType.types);
      let description = returnType.description;

      if (Nife.isNotEmpty(typeStr))
        content.push(`>\n> Return value: ${typeStr}\n`);
      else
        content.push('>\n> Return value:\n');

      if (Nife.isNotEmpty(description))
        content.push(`>  > ${punctuate(description).replace(/\n/g, '\n>  > ')}\n`);
    }

    content.push('\n');
  }

  if (Nife.isNotEmpty(sidebarItems))
    sidebarContent.push(`${sidebarItems.join('\n')}\n`);

  content.push('\n\n');

  return content.join('');
}

async function generatePages(pages, options) {
  let languageGenerator = options.generator.language;
  let outputDir         = options.outputDir;
  let pageNames         = Object.keys(pages).sort();
  let sidebarContent    = [];

  if (!languageGenerator)
    languageGenerator = TypescriptLanguageGenerator;

  for (let i = 0, il = pageNames.length; i < il; i++) {
    let pageName        = pageNames[i];
    let page            = pages[pageName];
    let outputFileName  = Path.join(outputDir, `${page.fileName}.md`);
    let outputContent   = generatePage(languageGenerator, page, sidebarContent, options);

    FileSystem.writeFileSync(outputFileName, outputContent, 'utf8');
  }

  sidebarContent = Nife.arrayFlatten(sidebarContent);
  sidebarContent = sidebarContent.join('');

  let sidebarFileName = Path.join(outputDir, '_Sidebar.md');
  FileSystem.writeFileSync(sidebarFileName, sidebarContent, 'utf8');
}

async function generate(artifacts, options) {
  if (Nife.isEmpty(options) || Nife.isEmpty(options.outputDir))
    throw new Error('generate: "outputDir" is a required "options" parameter.');

  let pages = groupArtifactsIntoPages(artifacts, options);
  await generatePages(pages, options);
}

module.exports = {
  generate,
};
