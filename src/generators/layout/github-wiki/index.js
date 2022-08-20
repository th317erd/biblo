'use strict';

const HTMLParser  = require('htmlparser2');
const renderHTML  = require('dom-serializer').default;
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
  const formatScopeName = (name) => {
    if (!name)
      return name;

    return name.replace(/[^\w_-]/g, '-');
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

function pageNameToFileName(pageName) {
  return pageName.replace(/[^\w_-]/g, '');
}

function groupArtifactsIntoPages(artifacts, options) {
  const createPageFromArtifact = (pageName, artifact) => {
    let page = {
      artifact:     artifact,
      artifactName: artifact.name,
      name:         pageName,
      fileName:     pageNameToFileName(pageName),
      type:         'class',
      artifacts:    [],
    };

    if (artifact.type === 'Page')
      page.type = 'page';
    else if (artifact.type === 'ClassDeclaration')
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

function parseAndGenerateDescription(_description, context) {
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

    if (node.type === 'tag') {
      let reference = Nife.get(node, 'children[0].data');
      if (reference) {
        let link = buildReferenceLink(reference.trim(), context);
        if (!link)
          return null;

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

  description = renderHTML(filterTags(DOM)).trim();
  description = description.replace(/@@@@@BLIBLO_TAG\[(\d+)\]@@@@@/g, unsubContentTag);

  return description;
}

function punctuate(_description, context) {
  let description = parseAndGenerateDescription(_description, context);

  if (!(/[!?.`]$/).test(description))
    return `${description}.`;

  return description;
}

function generateArgs(context) {
  let {
    languageGenerator,
    artifact,
    content,
  } = context;

  let args = Nife.get(artifact, 'comment.definition.arguments');
  if (Nife.isEmpty(args))
    args = artifact.arguments;

  if (Nife.isNotEmpty(args)) {
    content.push('>\n> **Arguments**:\n');
    for (let i = 0, il = args.length; i < il; i++) {
      let arg       = args[i];
      let signature = languageGenerator.generateSignature(arg, { fullDescription: true });

      content.push(`>   * ${signature}\n`);

      let description = arg.description;
      if (Nife.isNotEmpty(description))
        content.push(`>      > ${punctuate(description, context).replace(/\n/g, '\n>      > ')}\n`);
    }
  }
}

function generateReturn(context) {
  let {
    languageGenerator,
    artifact,
    content,
  } = context;

  let returnType = Nife.get(artifact, 'comment.definition.return');
  if (Nife.isEmpty(returnType))
    returnType = artifact['return'];

  if (Nife.isNotEmpty(returnType)) {
    let typeStr = languageGenerator.generateTypes(returnType.types);
    let description = returnType.description;

    if (Nife.isNotEmpty(typeStr))
      content.push(`>\n> **Return value**: \`${typeStr}\`\n`);
    else
      content.push('>\n> **Return value**: `undefined`\n');

    if (Nife.isNotEmpty(description))
      content.push(`>  > ${punctuate(description, context).replace(/\n/g, '\n>  > ')}\n`);
  }
}

function findArtifactByReference(pages, reference) {
  let parts     = reference.split(/[:.]+/g).map((part) => part.trim()).filter(Boolean);
  let pageName  = parts[0];
  let page      = pages[pageName];

  if (!page)
    return {};

  let referenceName = parts[1];
  if (!referenceName)
    return { page };

  let artifacts = page.artifacts;
  let artifact  = artifacts.find((artifact) => {
    return (artifact.name === referenceName);
  });

  return { page, artifact };
}

function buildReferenceLink(referenceName, { pages, options }) {
  let { page, artifact } = findArtifactByReference(pages, referenceName);
  if (!page && !artifact) {
    console.warn(`Warning: Unable to find "See Also" reference: "${referenceName}"`);
    return '';
  }

  if (!artifact)
    return `[${page.name}](${buildPageURL(page, options)})`;
  else
    return `[${artifact.name}](${buildArtifactURL(page, artifact, options)})`;
}

function generateSeeAlso({ pages, artifact: currentArtifact, content, options }) {
  let seeAlso = Nife.get(currentArtifact, 'comment.definition.see');
  if (Nife.isEmpty(seeAlso))
    return;

  let subContent = [];
  for (let i = 0, il = seeAlso.length; i < il; i++) {
    let arg = seeAlso[i];
    if (!arg || !arg.name)
      continue;

    subContent.push(buildReferenceLink(arg.name, { pages, options }));
  }

  if (Nife.isNotEmpty(subContent))
    content.push(`>\n> **See also**: ${subContent.join(', ')}\n`);
}

function generateNotes(context) {
  let {
    artifact,
    content,
  } = context;

  let notes = Nife.get(artifact, 'comment.definition.notes', []).filter(Nife.isNotEmpty);
  if (Nife.isEmpty(notes))
    return;

  content.push('>\n> **Notes**:\n');
  for (let i = 0, il = notes.length; i < il; i++) {
    let note = notes[i];
    content.push(`>   * ${punctuate(note, context)}\n`);
  }
}

function generateFunction(context) {
  let {
    options,
    page,
    artifact,
    content,
    sidebarItems,
    languageGenerator,
    functionType,
  } = context;

  sidebarItems.push(`  * ${functionType || 'function'} [${artifact.name}](${buildArtifactURL(page, artifact, options)})`);

  content.push(`#### <a name="${buildArtifactID(artifact)}"></a>${languageGenerator.generateSignature(artifact)}\n`);

  let description = punctuate(languageGenerator.generateDescription(artifact), context).replace(/\n/g, '\n> ');
  content.push(`> ${description}\n`);

  generateArgs(context);
  generateReturn(context);
  generateNotes(context);
  generateSeeAlso(context);
}

function generateClassProperty(context) {
  let {
    options,
    page,
    artifact,
    content,
    sidebarItems,
    languageGenerator,
  } = context;

  sidebarItems.push(`  * property [${artifact.name}](${buildArtifactURL(page, artifact, options)})`);

  content.push(`#### <a name="${buildArtifactID(artifact)}"></a>${languageGenerator.generateSignature(artifact)}\n`);

  let description = punctuate(languageGenerator.generateDescription(artifact), context).replace(/\n/g, '\n> ');
  content.push(`> ${description}\n`);

  generateNotes(context);
  generateSeeAlso(context);
}

function generateClass(context) {
  let {
    options,
    page,
    artifact,
    content,
    sidebarItems,
    languageGenerator,
    headerContent,
  } = context;

  let description = punctuate(languageGenerator.generateDescription(artifact), context).replace(/\n/g, '\n> ');
  headerContent.push(`> ${description}\n`);

  let properties = sortArtifacts(artifact.properties || []);
  for (let i = 0, il = properties.length; i < il; i++) {
    let propertyArtifact = properties[i];
    let comment = propertyArtifact.comment;
    let subContext = Object.assign(
      {},
      context,
      {
        artifact:     propertyArtifact,
        functionType: 'method',
        content,
        sidebarItems,
        headerContent,
      },
    );

    if (!comment)
      continue;

    generateClassProperty(subContext);

    content.push('\n\n<br>\n\n');
  }

  let methods = sortArtifacts(artifact.methods || []);
  for (let i = 0, il = methods.length; i < il; i++) {
    let methodArtifact = methods[i];
    let comment = methodArtifact.comment;
    let subContext = Object.assign(
      {},
      context,
      {
        artifact:     methodArtifact,
        functionType: 'method',
        content,
        sidebarItems,
        headerContent,
      },
    );

    if (!comment)
      continue;

    generateFunction(subContext);

    content.push('\n\n<br>\n\n');
  }
}

function getPageName(page) {
  if (page.type === 'namespace')
    return page.name;

  return page.artifactName || page.name;
}

function generatePageHeader(context) {
  let {
    page,
    languageGenerator,
  } = context;

  if (page.type === 'namespace')
    return `# namespace \`${getPageName(page)}\`\n\n`;

  return `# ${languageGenerator.generateSignature(page.artifact)}\n\n`;
}

function generatePage(context) {
  let {
    page,
    sidebarContent,
    options,
  } = context;

  let artifacts = page.artifacts.filter((artifact) => artifact.comment);
  if (Nife.isEmpty(artifacts) && page.type !== 'page')
    return;

  let content       = [];
  let headerContent = [];
  let sidebarItems  = [];

  sidebarItems.push(`* [${(page.type === 'page') ? '' : `${page.type} `}${getPageName(page)}](${buildPageURL(page, options)})`);

  if (page.type === 'page') {
    sidebarContent.push(`${sidebarItems.join('\n')}\n`);
    return parseAndGenerateDescription(page.artifacts[0].value, context);
  }

  artifacts = sortArtifacts(artifacts);

  if (Nife.isNotEmpty(artifacts))
    headerContent = [ generatePageHeader(context) ];

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    let comment = artifact.comment;
    let subContext = Object.assign({}, context, { artifact, content, sidebarItems, headerContent });

    if (!comment)
      continue;

    if (artifact.type === 'GlobalDocComment') {
      let descriptionBody = Nife.get(comment, 'definition.description.body');
      if (!Nife.isEmpty(descriptionBody))
        headerContent.push(descriptionBody);

      continue;
    }

    if (artifact.type === 'ClassDeclaration') {
      generateClass(subContext);
    } else if (artifact.type === 'FunctionDeclaration') {
      if (artifact.parentClass)
        continue;

      generateFunction(subContext);
    }

    content.push('\n\n<br>\n\n');
  }

  sidebarContent.push(`${sidebarItems.join('\n')}\n`);

  if (Nife.isNotEmpty(artifacts))
    content.push('\n\n');

  if (Nife.isNotEmpty(headerContent))
    content = headerContent.concat([ '\n\n' ], content);

  return content.join('');
}

async function generatePages(pages, options) {
  let languageGenerator = options.generator.language;
  let outputDir         = options.outputDir;
  let pageNames         = Object.keys(pages).sort();
  let sidebarContent    = [];

  if (!languageGenerator)
    languageGenerator = TypescriptLanguageGenerator;

  let pageTypeOrder = [
    'page',
    'namespace',
    'class',
  ];

  pageNames = pageNames.sort((a, b) => {
    let x = pages[a];
    let y = pages[b];

    let xOrder = pageTypeOrder.indexOf(x.type);
    let yOrder = pageTypeOrder.indexOf(y.type);

    if (xOrder !== yOrder)
      return Math.sign(xOrder - yOrder);

    let xName = x.artifactName || x.name;
    let yName = y.artifactName || y.name;

    if (xName === yName)
      return 0;

    return (xName < yName) ? -1 : 1;
  });

  for (let i = 0, il = pageNames.length; i < il; i++) {
    let pageName      = pageNames[i];
    let page          = pages[pageName];
    let outputContent = generatePage({ languageGenerator, pages, page, sidebarContent, options });

    if (Nife.isEmpty(outputContent))
      continue;

    let outputFileName = Path.join(outputDir, `${page.fileName}.md`);
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
