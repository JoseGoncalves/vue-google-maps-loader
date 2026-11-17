// Copyright (C) 2026 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
// SPDX-License-Identifier: Apache-2.0

// Prints the release notes of a version, as recorded in CHANGELOG.md: its
// section, then the compare link from the references at the bottom.
//
//   npm run --silent release:notes            (the package.json version)
//   npm run --silent release:notes -- 2.3.0

import { readFileSync } from 'node:fs';

const read = (file) =>
	readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const version = process.argv[2] ?? JSON.parse(read('package.json')).version;
const lines = read('CHANGELOG.md').split('\n');

const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
	console.error(`CHANGELOG.md has no section for ${version}`);
	process.exit(1);
}

// The section ends at the next version's heading, or at the link references
const rest = lines.slice(start + 1);
const end = rest.findIndex((line) => /^(## \[|\[[^\]]+\]: )/.test(line));
const notes = rest
	.slice(0, end === -1 ? rest.length : end)
	.join('\n')
	.trim();

if (!notes) {
	console.error(`The CHANGELOG.md section for ${version} is empty`);
	process.exit(1);
}

const link = lines.find(
	(line) => line.startsWith(`[${version}]: `) && line.includes('/compare/'),
);
const compare = link
	? `\n\n**Full changelog**: ${link.slice(link.indexOf(': ') + 2)}`
	: '';

console.log(notes + compare);
