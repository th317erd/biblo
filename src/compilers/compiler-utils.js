'use strict';

const {
  DEFAULT_PROP_REGEX,
  parseDocCommentSection,
} = require('./doc-comment-parser/parser-base');

const docCommentParsers = require('./doc-comment-parser');

function collectArtifactsIntoComments(_artifacts) {
  let artifacts = _artifacts;

  artifacts = artifacts.sort((a, b) => {
    let x = a.start;
    let y = b.start;

    if (x === y)
      return 0;

    return (x < y) ? -1 : 1;
  });

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

module.exports = {
  collectArtifactsIntoComments,
  parseDocComment,
  parseDocComments,
};
