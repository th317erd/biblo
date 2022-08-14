///! `CompilerUtils` is a collection of misc
///! utility functions used by the AST
///! compilers. The AST compilers take
///! the parsed AST to find the comments
///! and attach them to their respective
///! artifacts.
///!
///! An "Artifact" is any given chunk of
///! code, such as a "ClassDeclaration", a
///! "FunctionDeclaration", etc...
///! "Comment Artifacts" are also internally
///! generated from the comments found in
///! the source code.
///! DocScope: CompilerUtils

'use strict';

const Nife = require('nife');

const {
  DEFAULT_PROP_REGEX,
  parseDocCommentSection,
} = require('./doc-comment-parser/parser-base');

const docCommentParsers = require('./doc-comment-parser');

/// Sort all artifacts by source code position.
///
/// Return: Array<Artifact>
///   Return a new array of artifacts, where
///   the artifacts have been sorted based on
///   their position in the source code.
/// Arguments:
///   artifacts: Array<Artifact>
///     A list of artifacts and comment artifacts
///     to sort.
///   startPositionKey?: string = 'start'
///     An optional key to pull from each artifact to specify
///     its start position in the code.
function sortArtifacts(artifacts, _startPositionKey) {
  let startPositionKey = _startPositionKey || 'start';

  return artifacts.sort((a, b) => {
    let x = a[startPositionKey];
    let y = b[startPositionKey];

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

/// Remove duplicate artifacts from the list of artifacts.
///
/// An artifact is considered a duplicate if its "type",
/// "start" position, and "end" position properties are
/// the same.
///
/// Return: Array<Artifact>
///   Return a new array of artifacts, where
///   duplicate artifacts have been removed.
/// Arguments:
///   artifacts: Array<Artifact>
///     A list of artifacts and comment artifacts
///     to process.
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

/// Check if the specified artifact is a global comment.
///
/// Global comments take the form:
/// ```
///   ///! This is a global comment.
///   ///! There can only be one global comment per-file.
///   ///! A global comment is designated by putting an
///   ///! exclamation point after the triple forward
///   ///! slashes. A global comment will appear at the
///   ///! top of the page it specifies via the "DocScope"
///   ///! property. All other comments in the same file
///   ///! will also inherit any other properties defined
///   ///! in a global comment automatically. For example,
///   ///! all remaining comments in this file will also
///   ///! inherit my "DocScope" property that I specify.
///   ///!
///   ///! DocScope: MyCustomPageName
/// ```
///
/// Return: boolean
///   Return `true` if the specified artifact is
///   a global comment, or `false` otherwise.
/// Arguments:
///   artifacts: Artifact
///     An artifact to check.
/// See: CompilerUtils.getGlobalComment
function isGlobalComment(artifact) {
  if (!artifact)
    return false;

  if (artifact.type !== 'DocComment')
    return false;

  if (!artifact.value)
    return false;

  if (!(/^\/!/).test(artifact.value.trim()))
    return false;

  return true;
}

/// Search all provided artifacts and find the first global
/// comment. If no global comment is found, then return `undefined`.
///
/// Return: Artifact | undefined
///   Return the global comment artifact specified in
///   the source file if one exists, `undefined` otherwise.
/// Arguments:
///   artifacts: Array<Artifact>
///     A list of artifacts to search.
/// See: CompilerUtils.isGlobalComment
function getGlobalComment(artifacts) {
  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    if (isGlobalComment(artifact))
      return artifact;
  }
}

/// Collect all comments and assign them to
/// their respective artifact. This will iterate
/// all artifacts, find comments associated
/// with each, and put the associated comments
/// into each "artifact.comment" key inside the
/// artifact.
///
/// This method will also sort the artifacts by
/// source code position, and will also remove
/// any duplicate artifacts.
/// Return: Array<Artifact>
///   Return a new array of artifacts, where the
///   comment artifacts have been removed, and
///   inserted into their respective "artifact.comment"
/// Arguments:
///   artifacts: Array<Artifact>
///     A list of artifacts and comment artifacts
///     to mutate.
function collectCommentsIntoArtifacts(_artifacts) {
  let artifacts = removeDuplicateArtifacts(_artifacts);
  artifacts = sortArtifacts(artifacts);

  let finalArtifacts = [];
  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    if (artifact.type === 'DocComment') {
      if (isGlobalComment(artifact))
        finalArtifacts.push(artifact);

      continue;
    }

    let lastArtifact = artifacts[i - 1];
    if (lastArtifact && lastArtifact.type === 'DocComment' && !isGlobalComment(lastArtifact))
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
  let artifacts       = _artifacts;
  let globalArtifact  = getGlobalComment(artifacts);
  let globalComment;

  if (globalArtifact) {
    globalComment = parseDocComment(globalArtifact.value, globalArtifact);
    artifacts = [
      {
        type:       'GlobalDocComment',
        global:     true,
        comment: Object.assign({}, globalArtifact, {
          definition: globalComment,
        }),
      },
    ].concat(artifacts);
  }

  for (let i = 0, il = artifacts.length; i < il; i++) {
    let artifact = artifacts[i];
    if (artifact.type === 'DocComment' || artifact.type === 'GlobalDocComment')
      continue;

    let comment = artifact.comment;
    if (!comment)
      continue;

    comment.definition = Object.assign(
      {},
      globalComment || {},
      parseDocComment(comment.value, artifact),
      { global: false },
    );
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

  let { rootDir } = options;
  if (fullFileName.startsWith(rootDir))
    return fullFileName.substring(rootDir.length).replace(/^(.\/|\.\\|\/|\\)/, '');

  return fullFileName;
}

function getSourceControlFileName(fullFileName, options) {
  if (!fullFileName)
    return;

  let { sourceControlRootDir } = options;
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
