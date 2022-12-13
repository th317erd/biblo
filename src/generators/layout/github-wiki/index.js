'use strict';

const Nife        = require('nife');
const Path        = require('path');
const FileSystem  = require('fs');
const MiscUtils   = require('../../../utils/misc-utils');

const {
  GeneratorBase,
} = require('../../base');

const BASE_PREFIX = '';

class GitHubWikiGenerator extends GeneratorBase {
  onGenerateType(context, type) {
    let newType = type.replace(/<see(?:\s+name\s*=\s*"([^"]+)")?>\s*([\w.]+)\s*<\/see>/g, (m, nameOverride, reference) => {
      let link = this.buildReferenceLink(reference.trim(), { ...context, nameOverride });
      if (!link)
        return reference;

      return link;
    });

    let links = [];
    let parsedLinksResult = newType.replace(/\[[^\]]+\]\([^)]+\)/g, (m) => {
      let id = links.length;
      links.push(m);
      return `@@@LINK[${id}]@@@`;
    });

    if (links.length > 0) {
      parsedLinksResult = parsedLinksResult.replace(/@@@LINK\[\d+\]@@@|.*?/g, (m) => {
        let id = m.match(/@@@LINK\[(\d+)\]@@@/);
        if (id)
          return links[id[1]];

        if (Nife.isEmpty(m))
          return m;

        return `\`${m}\``;
      });

      return parsedLinksResult;
    }

    if (newType !== type)
      return newType;

    return `\`${type}\``;
  }

  buildArtifactID(artifact, options) {
    let isReference = (options && options.reference);
    let artifactID = super.buildArtifactID(artifact, options);

    if (isReference)
      artifactID = `user-content-${artifactID}`;

    return artifactID;
  }

  generateSourceLink(context) {
    let { artifact, options } = context;
    if (!artifact.lineNumber || !artifact.sourceControlFileName)
      return '';

    let repositoryURL = Nife.get(options, 'generatorOptions.repositoryURL');
    if (!repositoryURL)
      return '';

    return `[📜](${repositoryURL}/blob/main/${artifact.sourceControlFileName}#L${artifact.lineNumber})`;
  }

  generateArgs(context) {
    let {
      artifact,
      content,
    } = context;

    let args = Nife.get(artifact, 'comment.definition.arguments');
    if (Nife.isEmpty(args))
      args = artifact.arguments;

    if (Nife.isNotEmpty(args)) {
      content.push(`${BASE_PREFIX}\n${BASE_PREFIX} **Arguments**:\n`);
      for (let i = 0, il = args.length; i < il; i++) {
        let arg       = args[i];
        let signature = this.getLanguageGenerator().generateSignature(
          context,
          arg,
          {
            fullDescription: true,
          },
        );

        content.push(`${BASE_PREFIX}  * ${signature}\n`);

        let description = arg.description;
        if (Nife.isNotEmpty(description))
          content.push(`${BASE_PREFIX}\n      ${BASE_PREFIX} ${this.punctuate(description, context).replace(/\n/g, `\n${BASE_PREFIX}      ${BASE_PREFIX} `).replace(/^[>\s]+\|/gm, `${BASE_PREFIX}      ${BASE_PREFIX} |`)}\n`);
      }
    }
  }

  generateReturn(context) {
    let {
      artifact,
      content,
    } = context;

    let returnType = Nife.get(artifact, 'comment.definition.return');
    if (Nife.isEmpty(returnType))
      returnType = artifact['return'];

    if (Nife.isNotEmpty(returnType)) {
      let typeStr = this.getLanguageGenerator().generateTypes(context, returnType.types);
      let description = returnType.description;

      if (Nife.isNotEmpty(typeStr))
        content.push(`${BASE_PREFIX}\n${BASE_PREFIX} **Return value**: ${typeStr}\n`);
      else
        content.push('${BASE_PREFIX}\n${BASE_PREFIX} **Return value**: `undefined`\n');

      if (Nife.isNotEmpty(description))
        content.push(`${BASE_PREFIX}\n  ${BASE_PREFIX} ${this.punctuate(description, context).replace(/\n\s+/g, `\n${BASE_PREFIX}  ${BASE_PREFIX} `)}\n`);
    }
  }

  generateSeeAlso(context) {
    let {
      pages,
      artifact: currentArtifact,
      seeAlsoPrefix,
      content,
      options,
    } = context;

    let seeAlso = Nife.get(currentArtifact, 'comment.definition.see');
    if (Nife.isEmpty(seeAlso))
      return;

    let subContent = [];
    for (let i = 0, il = seeAlso.length; i < il; i++) {
      let arg = seeAlso[i];
      if (!arg || !arg.name)
        continue;

      let link = this.buildReferenceLink(arg.name, { pages, options, nameOverride: arg.altName });
      subContent.push(`${(arg['static']) ? '**static** ' : ''}${link}`);
    }

    if (Nife.isNotEmpty(subContent))
      content.push(`${(seeAlsoPrefix != null) ? seeAlsoPrefix : `${BASE_PREFIX}\n${BASE_PREFIX} `}**See also**: ${subContent.join(', ')}\n\n`);
  }

  generateNotes(context) {
    let {
      artifact,
      content,
      notesPrefix,
    } = context;

    let notes = Nife.get(artifact, 'comment.definition.notes', []).filter(Nife.isNotEmpty);
    if (Nife.isEmpty(notes))
      return;

    let _notesPrefix = (notesPrefix != null) ? notesPrefix : `${BASE_PREFIX} `;

    content.push(`${(notesPrefix != null) ? '' : `${BASE_PREFIX}\n${_notesPrefix}`}**Notes**:\n`);
    for (let i = 0, il = notes.length; i < il; i++) {
      let note = notes[i];

      content.push(`${_notesPrefix}  * ${this.punctuate(note, context)}\n`);
    }
  }

  generateExamples(context) {
    let {
      artifact,
      content,
      examplesPrefix,
    } = context;

    let examples = Nife.get(artifact, 'comment.definition.examples', []).filter(Nife.isNotEmpty);
    if (Nife.isEmpty(examples))
      return;

    let _examplesPrefix = (examplesPrefix != null) ? examplesPrefix : `${BASE_PREFIX} `;
    let title = (examples.length === 1) ? 'Example' : 'Examples';

    content.push(`${(examplesPrefix != null) ? '' : `${BASE_PREFIX}\n${_examplesPrefix}`}**${title}**:\n`);
    for (let i = 0, il = examples.length; i < il; i++) {
      let example = examples[i];

      example = example.replace(/\n/g, `\n${_examplesPrefix}`);

      content.push(`${_examplesPrefix} * \`\`\`${this.getLanguageGenerator().getLanguageType()}\n${_examplesPrefix}   ${example}\n${_examplesPrefix}   \`\`\`\n`);
    }
  }

  generateInterfaces(context) {
    let {
      artifact,
      content,
      interfacesPrefix,
    } = context;

    let interfaces = Nife.get(artifact, 'comment.definition.interfaces', []).filter(Nife.isNotEmpty);
    if (Nife.isEmpty(interfaces))
      return;

    let _interfacesPrefix = (interfacesPrefix != null) ? interfacesPrefix : `${BASE_PREFIX} `;
    let title = (interfaces.length === 1) ? 'Interface' : 'Interfaces';

    content.push(`${(interfacesPrefix != null) ? '' : `${BASE_PREFIX}\n${_interfacesPrefix}`}**${title}**:\n`);
    for (let i = 0, il = interfaces.length; i < il; i++) {
      let thisInterface = interfaces[i];

      thisInterface = thisInterface.replace(/\n/g, `\n${_interfacesPrefix}`);

      content.push(`${_interfacesPrefix} * \`\`\`${this.getLanguageGenerator().getLanguageType()}\n${_interfacesPrefix}   ${thisInterface}\n${_interfacesPrefix}   \`\`\`\n`);
    }
  }

  generateFunction(context) {
    let {
      options,
      page,
      artifact,
      content,
      sidebarItems,
      functionType,
    } = context;

    const argumentFormatter = (args) => {
      return `<br>&nbsp;&nbsp;&nbsp;&nbsp;${args.join(',<br>&nbsp;&nbsp;&nbsp;&nbsp;')},<br>`;
    };

    sidebarItems.push(`  * ${functionType || 'function'} [${artifact.name}](${this.buildArtifactURL(page, artifact, { ...(options || {}), reference: true })})`);

    let sourceURL = this.generateSourceLink(context);
    content.push(`### **<a id="${this.buildArtifactID(artifact)}"></a>${this.getLanguageGenerator().generateSignature(context, artifact, { argumentFormatter })}** ${sourceURL}\n`);

    let description = this.punctuate(this.getLanguageGenerator().generateDescription(context, artifact), context);
    //content.push(`> ${description.replace(/\n/g, '\n> ')}\n`);
    content.push(`${description}\n`);

    this.generateExamples(context);
    this.generateInterfaces(context);
    this.generateNotes(context);
    this.generateArgs(context);
    this.generateReturn(context);
    this.generateSeeAlso(context);
  }

  generateProperty(context) {
    let {
      options,
      page,
      artifact,
      content,
      sidebarItems,
    } = context;

    sidebarItems.push(`  * property [${artifact.name}](${this.buildArtifactURL(page, artifact, { ...(options || {}), reference: true })})`);

    let sourceURL = this.generateSourceLink(context);
    content.push(`### **<a name="${this.buildArtifactID(artifact)}"></a>${this.getLanguageGenerator().generateSignature(context, artifact)}** ${sourceURL}\n`);

    let description = this.punctuate(this.getLanguageGenerator().generateDescription(context, artifact), context);
    // content.push(`> ${description.replace(/\n/g, '\n> ')}\n`);
    content.push(`${description}\n`);

    this.generateExamples(context);
    this.generateInterfaces(context);
    this.generateNotes(context);
    this.generateSeeAlso(context);
  }

  generateProperties(context) {
    let {
      artifact,
      content,
      sidebarItems,
      headerContent,
    } = context;

    let properties        = artifact.properties || [];
    let commentProperties = Nife.get(artifact, 'comment.definition.properties', []);

    // Merge comments and parsed properties
    for (let i = 0, il = commentProperties.length; i < il; i++) {
      let commentProperty = commentProperties[i];
      let index           = properties.findIndex((property) => (property.name === commentProperty.name));
      let property        = (index < 0) ? null : properties[index];

      if (!property) {
        properties.push(commentProperty);
        continue;
      }

      properties[index] = MiscUtils.smartAssign({}, property, commentProperty);
    }

    properties = this.sortArtifacts(properties);

    for (let i = 0, il = properties.length; i < il; i++) {
      let propertyArtifact  = properties[i];
      let subContext        = Object.assign(
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

      this.generateProperty(subContext);

      content.push('\n\n<br>\n\n');
    }
  }

  generateClass(context) {
    let {
      artifact,
      content,
      sidebarItems,
      headerContent,
    } = context;

    let description = this.punctuate(this.getLanguageGenerator().generateDescription(context, artifact), context);
    headerContent.push(`${description}\n`);

    this.generateExamples({ ...context, examplesPrefix: '' });
    this.generateInterfaces({ ...context, interfacesPrefix: '' });
    this.generateNotes({ ...context, notesPrefix: '' });
    this.generateSeeAlso({ ...context, seeAlsoPrefix: '\n' });
    this.generateProperties(context);

    let methods = this.sortArtifacts(artifact.methods || []);
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

      this.generateFunction(subContext);

      content.push('\n\n<br>\n\n');
    }
  }

  generatePageHeader(context) {
    let {
      page,
    } = context;

    if (page.type === 'namespace')
      return `# namespace \`${this.getPageName(page)}\`\n\n`;

    let sourceURL = '';
    if (page.artifact && page.artifact.genericType === 'ClassDeclaration')
      sourceURL = this.generateSourceLink({ ...context, artifact: page.artifact });

    return `# ${this.getLanguageGenerator().generateSignature(context, page.artifact)} ${sourceURL}\n\n`;
  }

  generatePage(context) {
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

    sidebarItems.push(`* [${(page.type === 'page') ? '' : `${page.type} `}${this.getPageName(page)}](${this.buildPageURL(page, options)})`);

    if (page.type === 'page') {
      sidebarContent.push(`${sidebarItems.join('\n')}\n`);
      return this.parseAndGenerateDescription(page.artifacts[0].value, context);
    }

    artifacts = this.sortArtifacts(artifacts);

    if (Nife.isNotEmpty(artifacts))
      headerContent = [ this.generatePageHeader(context) ];

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

        this.generateProperties(subContext);

        continue;
      }

      if (artifact.type === 'ClassDeclaration') {
        this.generateClass(subContext);
      } else if (artifact.type === 'FunctionDeclaration') {
        if (artifact.parentClass)
          continue;

        this.generateFunction(subContext);
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

  async generatePages(pages, options) {
    let outputDir         = options.outputDir;
    let pageNames         = Object.keys(pages).sort();
    let sidebarContent    = [];

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
      let pageName  = pageNames[i];
      let page      = pages[pageName];

      if (page.alias)
        continue;

      let outputContent = this.generatePage({ pages, page, sidebarContent, options });
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

  async generate() {
    let options = this.getOptions();
    if (Nife.isEmpty(options) || Nife.isEmpty(options.outputDir))
      throw new Error('generate: "outputDir" is a required "options" parameter.');

    let artifacts = this.getArtifacts();
    let pages     = this.groupArtifactsIntoPages(artifacts, options);

    await this.generatePages(pages, options);
  }
}

module.exports = GitHubWikiGenerator;
