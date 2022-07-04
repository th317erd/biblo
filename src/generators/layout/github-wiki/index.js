'use strict';

const Nife        = require('nife');
const Path        = require('path');
const FileSystem  = require('fs');
const MiscUtils   = require('../../../utils/misc-utils');

function getPageNameFromArtifact(artifact) {
  const getArtifactScopeName = (artifact) => {
    if (artifact.comment && artifact.comment.docScope)
      return artifact.comment.docScope;

    return 'global';
  };

  if (artifact.type === 'ClassDeclaration')
    return artifact.name;

  return getArtifactScopeName(artifact);
}

function groupArtifactsIntoPages(artifacts, options) {
  const createPageFromArtifact = (pageName, artifact) => {
    if (artifact.type === 'ClassDeclaration')
      return { name: pageName, type: 'class', artifacts: [] };

    return { name: pageName, type: 'namespace', artifacts: [] };
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

function sanitizePageName(pageName, options) {
  return pageName.replace(/[^\w_-]/g, '');
}

function generatePage(generator, page, sidebarContent, options) {
  let artifacts     = page.artifacts;
  let content       = [];
  let sidebarItems  = [];

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    let comment = artifact.comment;

    if (!comment)
      continue;

    sidebarItems.push(`  <li>${artifact.name}</li>`);
  }

  sidebarContent.push('<ul>');
  sidebarContent.push(sidebarItems.join('\n'));
  sidebarContent.push('</ul>');

  return content.join('');
}

async function generatePages(pages, options) {
  let generator = MiscUtils.getGenerator('language', options);
  if (!generator)
    throw new TypeError('generatePages: Error, invalid "language" generator specified.');

  let outputDir       = options.outputDir;
  let pageNames       = Object.keys(pages);
  let sidebarContent  = [];

  for (let i = 0, il = pageNames.length; i < il; i++) {
    let pageName        = pageNames[i];
    let page            = pages[pageName];
    let safePageName    = sanitizePageName(pageName, options);
    let outputFileName  = Path.join(outputDir, `${safePageName}.md`);
    let outputContent   = generatePage(generator, sidebarContent, page, options);

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
