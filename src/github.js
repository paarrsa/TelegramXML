import { Octokit } from '@octokit/rest';
import { config } from './config.js';

let octokit = null;

function getOctokit() {
  if (!octokit) {
    octokit = new Octokit({ auth: config.GITHUB_TOKEN });
  }
  return octokit;
}

/**
 * Commits an array of files to GitHub in a single commit.
 *
 * @param {Array<{ path: string, content: string|Buffer, encoding?: string }>} files
 *   - path: repo-relative path (e.g. "channels/bbcnews.xml")
 *   - content: string (for XML) or Buffer (for images)
 *   - encoding: 'utf-8' (default) or 'base64' (for binary)
 * @param {string} message  Commit message
 */
export async function commitFiles(files, message) {
  const kit = getOctokit();
  const { GITHUB_OWNER: owner, GITHUB_REPO: repo, GITHUB_BRANCH: branch } = config;

  // 1. Get the latest commit SHA on the branch
  const { data: refData } = await kit.git.getRef({
    owner, repo,
    ref: `heads/${branch}`,
  });
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree SHA of that commit
  const { data: commitData } = await kit.git.getCommit({
    owner, repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeItems = [];
  for (const file of files) {
    const isBuffer = Buffer.isBuffer(file.content);
    const encoding = isBuffer ? 'base64' : 'utf-8';
    const content = isBuffer ? file.content.toString('base64') : file.content;

    const { data: blob } = await kit.git.createBlob({
      owner, repo,
      content,
      encoding,
    });

    treeItems.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  // 4. Create a new tree
  const { data: newTree } = await kit.git.createTree({
    owner, repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // 5. Create the commit
  const { data: newCommit } = await kit.git.createCommit({
    owner, repo,
    message,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // 6. Update the branch reference
  await kit.git.updateRef({
    owner, repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  console.log(`✅ Committed ${files.length} file(s): ${newCommit.sha.slice(0, 7)}`);
  return newCommit.sha;
}
