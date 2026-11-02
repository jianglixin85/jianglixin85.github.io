#!/usr/bin/env node
/**
 * 构建并把 dist/ 发布到 GitHub Pages（gh-pages 分支）。
 *
 * 走 GitHub Git Data API，不依赖 git push（国内直连 github.com 常超时）。
 * 认证复用 gh CLI 已登录的凭据，脚本本身不保存任何 token。
 *
 * 用法：
 *   pnpm deploy:pages              # 构建 + 发布
 *   pnpm deploy:pages --skip-build # 跳过构建，直接发布当前 dist/
 *   GH_PAGES_REPO=owner/repo pnpm deploy:pages
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const skipBuild = process.argv.includes('--skip-build');
const repo = process.env.GH_PAGES_REPO || 'jianglixin85/jianglixin85.github.io';
const branch = process.env.GH_PAGES_BRANCH || 'gh-pages';

function findGh() {
  for (const candidate of ['gh', join(homedir(), '.local/bin/gh')]) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  console.error('未找到 gh CLI。请先安装并完成 gh auth login。');
  process.exit(1);
}
const GH = findGh();

function gh(args, payload) {
  const cmd = [GH, 'api', ...args];
  if (payload !== undefined) cmd.push('--input', '-');
  const out = execFileSync(cmd[0], cmd.slice(1), {
    input: payload === undefined ? undefined : JSON.stringify(payload),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.trim() ? JSON.parse(out) : {};
}

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
}

if (!skipBuild) {
  console.log('▸ 构建中…');
  run('pnpm', ['build']);
}

if (!existsSync(dist)) {
  console.error('dist/ 不存在，请先执行 pnpm build。');
  process.exit(1);
}
if (!existsSync(join(dist, '.nojekyll'))) {
  console.error('dist/.nojekyll 缺失，GitHub Pages 会忽略 _astro 资源。请确认 public/.nojekyll 存在后重新构建。');
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

console.log(`▸ 上传 ${repo} (${branch}) …`);
let ref;
try {
  ref = gh([`repos/${repo}/git/ref/heads/${branch}`]);
} catch (err) {
  console.error(err?.stderr?.toString?.().trim() || err.message);
  console.error(`分支 ${branch} 不存在，请先在仓库里创建并推送一次该分支。`);
  process.exit(1);
}
const parent = gh([`repos/${repo}/git/commits/${ref.object.sha}`]);

const tree = walk(dist).map((file) => {
  const content = readFileSync(file, 'base64');
  const blob = gh([`repos/${repo}/git/blobs`], { content, encoding: 'base64' });
  return {
    path: relative(dist, file).split('\\').join('/'),
    mode: '100644',
    type: 'blob',
    sha: blob.sha,
  };
});

const newTree = gh([`repos/${repo}/git/trees`], { tree });
if (newTree.sha === parent.tree.sha) {
  console.log('▸ 内容与线上一致，跳过提交。');
} else {
  const commit = gh([`repos/${repo}/git/commits`], {
    message: `deploy: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    tree: newTree.sha,
    parents: [parent.sha],
  });
  gh([`repos/${repo}/git/refs/heads/${branch}`, '-X', 'PATCH'], {
    sha: commit.sha,
    force: true,
  });
  console.log(`▸ 已提交 ${commit.sha.slice(0, 7)}`);
}

console.log('▸ 触发 Pages 构建…');
gh([`repos/${repo}/pages/builds`, '-X', 'POST']);

const status = () => gh([`repos/${repo}/pages/builds/latest`]).status;
const deadline = Date.now() + 5 * 60 * 1000;
let current = status();
while (current === 'queued' || current === 'building') {
  if (Date.now() > deadline) {
    console.warn(`▸ 构建仍在进行（${current}），请稍后自行检查。`);
    process.exit(0);
  }
  execFileSync('sleep', ['5']);
  current = status();
}

if (current !== 'built') {
  console.error(`▸ Pages 构建失败：${current}`);
  process.exit(1);
}
console.log(`✓ 发布完成：${gh([`repos/${repo}/pages`]).html_url}`);
