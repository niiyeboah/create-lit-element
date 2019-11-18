#!/usr/bin/env node
'use strict';

const { argv } = require('yargs');
const _prompt = require('prompt');
const { mv, rm, which, exec } = require('shelljs');
const replace = require('replace-in-file');
const colors = require('colors');
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { copySync, pathExistsSync, mkdirpSync } = require('fs-extra');
const ora = require('ora');

let targetDirectory = argv._[0];
const defaultDirectory = !Boolean(targetDirectory);

if (defaultDirectory) {
  targetDirectory = process.cwd();
}

const errorMessage = 'There was an error building the workspace';

const modifyFiles = [
  '.gitignore',
  'create-lit-element.ts',
  'index.html',
  'LICENSE',
  'README.md',
  'package.json',
  'tsconfig.json',
  'src/create-lit-element.ts',
  'test/unit/create-lit-element.test.ts',
  'test/visual/defualt.html',
  'test/visual/test.js'
];

const renameFiles = [
  ['.npmignore', '.gitignore'],
  ['create-lit-element.ts', 'create-lit-element.ts'],
  ['src/create-lit-element.ts', 'src/create-lit-element.ts'],
  ['test/unit/create-lit-element.test.ts', 'test/unit/create-lit-element.test.ts']
];

const _promptSchemaElementName = {
  properties: {
    element: {
      description: colors.cyan('What do you want the element to be called? (use kebab-case)'),
      pattern: /^[a-z]+(\-[a-z]+)*$/,
      type: 'string',
      required: true,
      message: '"kebab-case" uses lowercase letters, and hyphens for any punctuation'
    }
  }
};

const _promptSchemaElementDescription = {
  properties: {
    description: {
      description: colors.cyan('Please provide a description of the element'),
      pattern: /.*/,
      type: 'string'
    }
  }
};

const _promptSchemaElementSuggest = {
  properties: {
    useSuggestedName: {
      description: colors.cyan('Would you like the element to be called "' + elementNameSuggested() + '"? ') + colors.white('[Yes/No]'),
      pattern: /^(y(es)?|n(o)?)$/i,
      type: 'string',
      required: true,
      message: 'You need to type "Yes" or "No" to continue...'
    }
  }
};

_prompt.start();
_prompt.message = '';

// Clear console
process.stdout.write('\x1B[2J\x1B[0f');

if (!which('git')) {
  console.log(colors.red('Sorry, this script requires git'));
  process.exit(1);
}

// Generate the element name and start the tasks.
try {
  if (process.env.CI == null) {
    if (!elementNameSuggestedIsDefault()) {
      elementNameSuggestedAccept();
    } else {
      elementNameCreate();
    }
  } else {
    // This is being run in a CI environment, so don't ask any questions
    setupElement(elementNameSuggested(), '');
  }
} catch(e) {
  console.error(`${e}\n`);
  console.log(colors.red(errorMessage));
  removeTargetDirectory();
}

/**
 * Asks the user for the name of the element if it has been cloned into the
 * default directory, or if they want a different name to the one suggested.
 */
function elementNameCreate() {
  _prompt.get(_promptSchemaElementName, (err, res) => {
    if (err) {
      console.log(colors.red(errorMessage));
      removeTargetDirectory();
      process.exit(1);
      return;
    }

    elementDescriptionCreate(res.element);
  });
}

/**
 * Asks the user for a decription of the element to be used in package.json and summary for jsdocs.
 */
function elementDescriptionCreate(elementname) {
  _prompt.get(_promptSchemaElementDescription, (err, res) => {
    if (err) {
      console.log(colors.red(errorMessage));
      removeTargetDirectory();
      process.exit(1);
      return;
    }

    setupElement(elementname, res.description);
  });
}

/**
 * Sees if the users wants to accept the suggested element name if the project
 * has been cloned into a custom directory (i.e. it's not 'create-lit-element').
 */
function elementNameSuggestedAccept() {
  _prompt.get(_promptSchemaElementSuggest, (err, res) => {
    if (err) {
      console.log(colors.red("Sorry, you'll need to type the element name"));
      elementNameCreate();
    }

    if (res.useSuggestedName.toLowerCase().charAt(0) === 'y') {
      elementDescriptionCreate(elementNameSuggested());
    } else {
      elementNameCreate();
    }
  });
}

/**
 * The element name is suggested by looking at the directory name of the
 * tools parent directory and converting it to kebab-case.
 *
 * The regex for this looks for any non-word or non-digit character, or
 * an underscore (as it's a word character), and replaces it with a dash.
 * Any leading or trailing dashes are then removed, before the string is
 * lowercased and returned.
 */
function elementNameSuggested() {
  return path
    .basename(path.resolve(targetDirectory))
    .replace(/[^\w\d]|_/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Checks if the suggested element name is the default, which is 'create-lit-element'.
 */
function elementNameSuggestedIsDefault() {
  if (elementNameSuggested() === 'create-lit-element') {
    return true;
  }

  return false;
}

/**
 * Calls all of the functions needed to setup the element.
 *
 * @param elementname
 */
function setupElement(elementname, elementdescription) {
  console.log(colors.cyan('\nThe last few changes are being made...\n'));

  // Get the Git username and email before the .git directory is removed
  let username = exec('git config user.name').stdout.trim();
  let usermail = exec('git config user.email').stdout.trim();

  if (!defaultDirectory)  {
    createTargetDirectory();
  }

  copyFilesToTarget();

  modifyContents(elementname, elementdescription, username, usermail);

  renameItems(elementname);

  finalize();
}

/**
 * Checks target directory doesn't exist and creates it.
 * If no target directory is provided the current working directory is used.
 */
function createTargetDirectory() {
  if (pathExistsSync(targetDirectory)) {
    throw new Error(`The directory ${targetDirectory} already exists.`);
  } else {
    mkdirpSync(targetDirectory);
    console.log(colors.cyan('\nSuccessfully created ') + `${targetDirectory}`);
  }
}

/**
 * Removes the created target directory.
 */
function removeTargetDirectory() {
  if (!defaultDirectory) {
    rm('-rf', path.resolve(targetDirectory));
  }
}

/**
 * Copies template files to the target directory.
 */
function copyFilesToTarget() {
  const templateDirectory = `${__dirname}/../template`;
  console.log(colors.cyan('\nCopying files to ') + `${targetDirectory}\n`);
  copySync(templateDirectory, targetDirectory);
  console.log(colors.cyan('Successfully copied files to ') + `${targetDirectory}\n`);
}

/**
 * Updates the contents of the template files with the element name or user details.
 *
 * @param elementname
 * @param elementdescription
 * @param username
 * @param usermail
 */
function modifyContents(elementname, elementdescription, username, usermail) {
  console.log(colors.underline.white('Modified'));

  const elementclassname = elementname
    .split('-')
    .map((c) => c[0].toUpperCase() + c.slice(1))
    .join('');

  const files = modifyFiles.map((f) => path.resolve(targetDirectory, f));
  try {
    replace.sync({
      files,
      from: [
        /create-lit-element/g,
        /CreateLitElement/g,
        /--elementdescription--/g,
        /--username--/g,
        /--usermail--/g
      ],
      to: [elementname, elementclassname, elementdescription, username, usermail]
    });
    console.log(colors.cyan(modifyFiles.join('\n')));
  } catch (error) {
    console.error('An error occurred modifying the file: ', error);
  }

  console.log('\n');
}

/**
 * Renames any template files to the new element name.
 *
 * @param elementname
 */
function renameItems(elementname) {
  console.log(colors.underline.white('Renamed'));

  renameFiles.forEach(function(files) {
    const newFilename = files[1].replace(/create-lit-element/g, elementname);
    mv(path.resolve(targetDirectory, files[0]), path.resolve(targetDirectory, newFilename));
    console.log(colors.cyan(files[0] + ' => ' + newFilename));
  });

  console.log('\n');
}

/**
 * Calls any external programs to finish setting up the element.
 */
function finalize() {
  console.log(colors.underline.white('Finalizing'));

  // Init git repo
  let gitInitOutput = exec('git init "' + path.resolve(targetDirectory) + '"', { silent: true }).stdout;
  console.log(colors.cyan(gitInitOutput.replace(/(\n|\r)+/g, '')));

  // Remove * and .gitignore from package.json files property
  let jsonPackage = path.resolve(targetDirectory, 'package.json');
  const pkg = JSON.parse(readFileSync(jsonPackage));
  pkg.files = pkg.files.slice(2);
  writeFileSync(jsonPackage, JSON.stringify(pkg, null, 2));
  console.log(colors.cyan('Cleaned package.json files property\n'));

  // Install dependencies with npm
  const installing = ora('Installing dependencies with npm\n').start();
  exec('cd ' + path.resolve(targetDirectory) + ' && npm i &> /dev/null', () => {
    installing.stop();
    console.log(colors.cyan("\nYou're all set") + ' }>\n');
  });
}
