'use strict';

const Nife = require('nife');

const {
  DEFAULT_PROP_REGEX,
  parseDocCommentSection,
} = require('./doc-comment-parser/parser-base');

const docCommentParsers = require('./doc-comment-parser');

function sortArtifacts(artifacts) {
  return artifacts.sort((a, b) => {
    let x = a.start;
    let y = b.start;

    if (x === y)
      return 0;

    return (x < y) ? -1 : 1;
  });
}

function collectArtifactsIntoComments(_artifacts) {
  let artifacts = sortArtifacts(_artifacts);

  for (let i = 1, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    if (artifact.type !== 'DocComment') {
      let lastArtifact = artifacts[i - 1];
      if (!lastArtifact || lastArtifact.type !== 'DocComment')
        continue;

      lastArtifact.target = artifact;
    }
  }

  artifacts = artifacts.filter((artifact) => {
    return (artifact.type === 'DocComment');
  });

  return artifacts;
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
    if (artifact.type !== 'DocComment')
      continue;

    artifact.definition = parseDocComment(artifact.value, artifact);
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

module.exports = {
  collectArtifactsIntoComments,
  parseDocComment,
  parseDocComments,
  sortArtifacts,
  collectComments,
};
