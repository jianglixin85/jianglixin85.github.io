#!/usr/bin/env node
/**
 * 把 dist/ 发布到腾讯云 CloudBase 静态托管（纯文件上传，不重新构建）。
 *
 * 环境 ID 从 cloudbaserc.json 读取（该文件不入库），也可用 TCB_ENV_ID 覆盖。
 *
 * 用法：
 *   pnpm deploy:cloudbase   # 需先 pnpm build
 *   pnpm deploy:all         # 一次构建，同时发布 GitHub Pages + CloudBase
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ 不存在，请先执行 pnpm build。');
  process.exit(1);
}

let envId = process.env.TCB_ENV_ID;
if (!envId) {
  const configPath = join(root, 'cloudbaserc.json');
  if (existsSync(configPath)) {
    envId = JSON.parse(readFileSync(configPath, 'utf8')).envId;
  }
}
if (!envId) {
  console.error('缺少环境 ID：请在 cloudbaserc.json 配置 envId，或设置环境变量 TCB_ENV_ID。');
  process.exit(1);
}

let tcb;
try {
  tcb = execSync('command -v tcb', { encoding: 'utf8' }).trim();
} catch {
  console.error('未找到 tcb CLI，请先安装：npm i -g @cloudbase/cli');
  process.exit(1);
}

console.log(`▸ 上传到 CloudBase 环境 ${envId} …`);
execFileSync(tcb, ['hosting', 'deploy', dist, '-e', envId], { cwd: root, stdio: 'inherit' });
console.log('✓ CloudBase 发布完成');
