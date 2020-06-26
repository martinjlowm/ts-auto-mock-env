import assert = require('assert');
import childProcess = require('child_process');
import fs = require('fs');
import path = require('path');

const [,, ...fileArguments] = process.argv;
const [configFile] = fileArguments as Array<string | undefined>;

assert(configFile, '! You must specify a tsconfig file to generate mocks from!');
assert(fs.statSync(configFile));

const tsConfig = JSON.parse(fs.readFileSync(configFile).toString());

// The following runs two parses of ttsc with two different transformers. First,
// the type checker is used to expand globally declared variables from
// `globalThis` and the output is passed into `ts-auto-mock` to generate the
// runtime mocks.
//
// Hopefully, sometime in the future, this can be simplified by chaining
// transformers. But as of this writing, there's no TypeScript API to refresh
// the type checker state in-between custom transformers.

const baseCompilerOptions = tsConfig.compilerOptions || {};
const environmentConfig = {
  ...tsConfig,
  compilerOptions: {
    ...baseCompilerOptions,
  },
}
const basePlugins = tsConfig.compilerOptions.plugins || [];

const temporaryFiles: string[] = [];

const configDirectory = path.dirname(configFile);

const temporaryEnvironmentConfigFile = path.join(configDirectory, `__env.${path.basename(configFile)}`);
temporaryFiles.push(temporaryEnvironmentConfigFile);

const temporaryMockConfigFile = path.join(configDirectory, `__mock.${path.basename(configFile)}`);
temporaryFiles.push(temporaryMockConfigFile);

const temporaryIntermediateInputFile = path.join(configDirectory, `__index.ts`);
temporaryFiles.push(temporaryIntermediateInputFile);

fs.writeFileSync(temporaryEnvironmentConfigFile, JSON.stringify({
  ...environmentConfig,
  compilerOptions: {
    ...environmentConfig.compilerOptions,
    plugins: [
      ...basePlugins,
      {
        transform: require.resolve(path.resolve(__dirname, '..', 'transformers', 'mock-generator')),
      },
    ],
  },
}));

fs.writeFileSync(temporaryMockConfigFile, JSON.stringify({
  ...environmentConfig,
  compilerOptions: {
    ...environmentConfig.compilerOptions,
    plugins: [
      ...basePlugins,
      {
        transform: 'ts-auto-mock/transformer',
        cacheBetweenTests: false,
        features: ['overloads'],
      },
    ],
  },
}));

fs.writeFileSync(temporaryIntermediateInputFile, 'globalThis');

const temporaryIntermediateOutputFile = temporaryIntermediateInputFile.replace(/ts$/, 'js');
temporaryFiles.push(temporaryIntermediateOutputFile);

try {
  childProcess.execFileSync('ttsc', ['-p', temporaryEnvironmentConfigFile], { stdio: 'inherit' });

  const definitions = fs.readFileSync(temporaryIntermediateOutputFile).toString().split('\n');

  const typedDefinitions = definitions.map(definition => {
    const [, identifier] = /^globalThis\.([^ ]+) = createMock\(\);$/mg.exec(definition) || [];

    if (!identifier) {
      return definition;
    }

    return definition.replace('createMock', `createMock<typeof ${identifier}>`);
  });

  fs.writeFileSync(temporaryIntermediateInputFile, typedDefinitions.join('\n'));

  childProcess.execFileSync('ttsc', ['-p', temporaryMockConfigFile], { stdio: 'inherit' });

  fs.copyFileSync(temporaryIntermediateOutputFile, path.join(configDirectory, 'index.js'));
} catch (_) {
} finally {
  for (const temporaryFile of temporaryFiles) {
    fs.unlinkSync(temporaryFile);
  }
}
