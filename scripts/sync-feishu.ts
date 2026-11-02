import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, rmSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import config from '../sync.config';

const OUTPUT_BASE = join(import.meta.dirname, '..', 'src', 'content', 'notes-feishu');

function run(cmd: string, cwd?: string) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], cwd });
  } catch (e: any) {
    console.error(`Command failed: ${cmd}`);
    console.error(e.stderr || e.message);
    return null;
  }
}

function cleanDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const f of readdirSync(dir)) {
    if (f === '.gitkeep') continue;
    const fullPath = join(dir, f);
    if (statSync(fullPath).isDirectory()) {
      rmSync(fullPath, { recursive: true });
    } else {
      unlinkSync(fullPath);
    }
  }
}

interface DriveFile {
  token: string;
  name: string;
  type: string;
  url: string;
  parent_token: string;
  modified_time: string;
  created_time: string;
}

function listFolder(folderToken: string, identity: string): DriveFile[] {
  const files: DriveFile[] = [];
  let pageToken = '';

  while (true) {
    const cmd = [
      'lark-cli drive files list',
      `--folder-token ${folderToken}`,
      `--page-size 200`,
      `--as ${identity}`,
      '--format json',
      ...(pageToken ? [`--page-token ${pageToken}`] : []),
    ].join(' ');

    const result = run(cmd);
    if (!result) break;

    const data = JSON.parse(result);
    if (data.ok === false) {
      console.error(`Failed to list folder ${folderToken}: ${data.error?.message || 'unknown'}`);
      break;
    }

    const filesData = data.data?.files || data.files || [];
    files.push(...filesData);

    const hasMore = data.data?.has_more ?? data.has_more ?? false;
    if (!hasMore) break;
    pageToken = data.data?.next_page_token ?? data.next_page_token ?? '';
    if (!pageToken) break;
  }

  return files;
}

function exportDoc(token: string, docType: string, outputDir: string): string | null {
  const supportedTypes = ['docx', 'doc', 'sheet', 'bitable', 'slides'];
  if (!supportedTypes.includes(docType)) {
    console.log(`  Skipping ${token} (type: ${docType}, not exportable)`);
    return null;
  }

  const mappedType = docType === 'doc' ? 'doc' : docType;
  const result = run(
    `lark-cli drive +export --token ${token} --doc-type ${mappedType} --file-extension markdown --overwrite --as user`,
    outputDir,
  );

  if (!result) return null;

  try {
    const data = JSON.parse(result);
    if (data.ok) {
      console.log(`  Exported: ${data.data.file_name}`);
      return data.data.file_name as string;
    }
    console.error(`  Export failed for ${token}: ${data.error?.message || 'unknown'}`);
    return null;
  } catch {
    return null;
  }
}

function addFrontmatter(filePath: string, spaceName: string, spaceTag: string, docUrl: string, docName?: string) {
  let content = readFileSync(filePath, 'utf-8');

  // Strip <title>...</title> lines from the top of the file
  content = content.replace(/^<title>.*?<\/title>\s*\n?/i, '');

  if (content.startsWith('---')) {
    writeFileSync(filePath, content);
    return;
  }

  // Use file name as fallback when content heading is generic or absent
  const genericTitles = ['前言', '版本信息', '目录', '概述', '简介'];
  const firstLine = (content.split('\n').find((l) => l.trim()) || '').trim();
  // Only treat the first line as a title when it is an actual Markdown heading;
  // otherwise it is likely a body paragraph and must not be used as the title.
  const isHeading = /^#{1,6}\s/.test(firstLine);
  let title = firstLine
    .replace(/^#+\s*/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*/g, '')
    .trim();
  if (!isHeading || !title || genericTitles.includes(title)) {
    // Use the doc name from Feishu (without extension) as the title
    title = (docName || basename(filePath, '.md') || spaceName).trim();
  }
  const now = new Date().toISOString().split('T')[0];

  const fm = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `description: ""`,
    `tags: ["${spaceTag}"]`,
    `date: ${now}`,
    `lang: ${config.frontmatter.lang}`,
    `source: ${config.frontmatter.source}`,
    `draft: ${config.frontmatter.draft}`,
    `feishuUrl: "${docUrl}"`,
    '---',
    '',
  ].join('\n');

  writeFileSync(filePath, fm + content);
}

function main() {
  console.log('Syncing Feishu documents via lark-cli...\n');

  // Verify lark-cli is available
  const versionCheck = run('lark-cli --version');
  if (versionCheck === null) {
    console.error('lark-cli is not installed. Run: npm install -g @larksuite/cli');
    process.exit(1);
  }

  // Verify user auth
  const authStatus = run('lark-cli auth status');
  if (authStatus) {
    try {
      const auth = JSON.parse(authStatus);
      if (auth.identity === 'bot' || !auth.identities?.user?.available) {
        console.error('User identity not available. Run: lark-cli auth login --domain drive');
        process.exit(1);
      }
    } catch {
      // continue anyway
    }
  }

  cleanDir(OUTPUT_BASE);

  for (const space of config.feishu.spaces) {
    const outputDir = space.output ? join(OUTPUT_BASE, space.output) : OUTPUT_BASE;
    mkdirSync(outputDir, { recursive: true });
    if (space.output) cleanDir(outputDir);

    console.log(`\nSyncing space: ${space.name} -> ${space.output || 'notes-feishu/'}`);

    // List all files in the folder
    const files = listFolder(space.folderToken, 'user');
    console.log(`Found ${files.length} items in folder`);

    let exported = 0;

    for (const file of files) {
      if (file.type === 'folder') {
        // Recurse into subfolders
        console.log(`\nEntering subfolder: ${file.name}`);
        const subFiles = listFolder(file.token, 'user');
        for (const subFile of subFiles) {
          const exportedName = exportDoc(subFile.token, subFile.type, outputDir);
          if (exportedName) {
            const mdPath = join(outputDir, exportedName);
            if (existsSync(mdPath)) {
              const docTitle = subFile.name;
              addFrontmatter(mdPath, space.name, space.tag, subFile.url, docTitle);
              exported++;
            }
          }
        }
        continue;
      }

      const exportedName = exportDoc(file.token, file.type, outputDir);
      if (exportedName) {
        const mdPath = join(outputDir, exportedName);
        if (existsSync(mdPath)) {
          const docTitle = file.name;
          addFrontmatter(mdPath, space.name, space.tag, file.url, docTitle);
          exported++;
        }
      }
    }

    console.log(`\n  Total exported for "${space.name}": ${exported} documents`);
  }

  console.log('\nFeishu sync complete!');
}

main();
