'use strict';

const Nife = require('nife');

const {
  getRootDirsFromOptions,
} = require('../utils/misc-utils');

const {
  DEFAULT_PROP_REGEX,
  parseDocCommentSection,
} = require('./doc-comment-parser/parser-base');

const docCommentParsers = require('./doc-comment-parser');

function sortArtifacts(artifacts, _key) {
  let key = _key || 'start';

  return artifacts.sort((a, b) => {
    let x = a[key];
    let y = b[key];

    if (x === y) {
      x = a['end'];
      y = b['end'];

      if (x === y)
        return 0;

      return (x < y) ? -1 : 1;
    }

    return (x < y) ? -1 : 1;
  });
}

function removeDuplicateArtifacts(artifacts) {
  let artifactMap = {};

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact  = artifacts[i];
    let key       = `${artifact.type}:${artifact.start}:${artifact.end}`;

    if (artifactMap[key])
      continue;

    artifactMap[key] = artifact;
  }

  return Array.from(Object.values(artifactMap));
}

function collectCommentsIntoArtifacts(_artifacts) {
  let artifacts = removeDuplicateArtifacts(_artifacts);
  artifacts = sortArtifacts(artifacts);

  // console.log('Final artifacts: ', artifacts);

  let finalArtifacts = [];
  for (let i = 1, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    if (artifact.type === 'DocComment')
      continue;

    let lastArtifact = artifacts[i - 1];
    if (lastArtifact && lastArtifact.type === 'DocComment')
      artifact.comment = lastArtifact;

    finalArtifacts.push(artifact);
  }

  return finalArtifacts;
}

function parseDocComment(comment, artifact) {
  let lines = comment.split(/\n+/g);
  return parseDocCommentSection.call(
    artifact,
    docCommentParsers,
    lines,
    DEFAULT_PROP_REGEX,
    { name: 'description', extra: '' },
  );
}

function parseDocComments(_artifacts) {
  let artifacts = _artifacts;

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    if (artifact.type === 'DocComment')
      continue;

    let comment = artifact.comment;
    if (!comment)
      continue;

    comment.definition = parseDocComment(comment.value, artifact);
  }

  return artifacts;
}

function collectComments(source, comments) {
  let currentComment  = [];
  let finalComments   = [];
  let previousStart;
  let previousEnd;

  for (let i = 0, il = comments.length; i < il; i++) {
    let comment = comments[i];

    let {
      type,
      value,
      start,
      end,
    } = comment;

    if (type !== 'CommentLine')
      continue;

    if (previousEnd) {
      let chunk = source.substring(previousEnd, start);
      if (Nife.isNotEmpty(chunk)) {
        if (currentComment.length > 0) {
          finalComments.push({
            'type':         'DocComment',
            'genericType':  'Comment',
            'start':        previousStart,
            'end':          previousEnd,
            'value':        currentComment.join('\n'),
          });
        }

        previousStart = null;
        currentComment = [];
      }
    }

    currentComment.push(value);

    if (!previousStart)
      previousStart = start;

    previousEnd = end;
  }

  if (currentComment.length > 0) {
    finalComments.push({
      'type':         'DocComment',
      'genericType':  'Comment',
      'start':        previousStart,
      'end':          previousEnd,
      'value':        currentComment.join('\n'),
    });
  }

  return finalComments;
}

function parseFloatingDescription(body) {
  return Nife.toArray(body)
    .filter((comment) => {
      if (!comment)
        return false;

      if (comment.value.match(/^\//))
        return false;

      return true;
    })
    .map((comment) => comment.value.trim())
    .filter(Boolean)
    .join(' ');
}

function getRelativeFileName(fullFileName, options) {
  if (!fullFileName)
    return;

  let { rootDir } = getRootDirsFromOptions(options);
  if (fullFileName.startsWith(rootDir))
    return fullFileName.substring(rootDir.length).replace(/^(.\/|\.\\|\/|\\)/, '');

  return fullFileName;
}

function getSourceControlFileName(fullFileName, options) {
  if (!fullFileName)
    return;

  let { sourceControlRootDir } = getRootDirsFromOptions(options);
  if (fullFileName.startsWith(sourceControlRootDir))
    return fullFileName.substring(sourceControlRootDir.length).replace(/^(.\/|\.\\|\/|\\)/, '');

  return fullFileName;
}

module.exports = {
  collectCommentsIntoArtifacts,
  collectComments,
  parseDocComment,
  parseDocComments,
  parseFloatingDescription,
  sortArtifacts,
  getRelativeFileName,
  getSourceControlFileName,
};
