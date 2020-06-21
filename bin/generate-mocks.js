const childProcess = require('child_process');

const [,, ...fileArguments] = process.argv;

try {
  childProcess.execFileSync(
    'node',
    [
      `${__dirname}/../scripts/generate-mocks.ts`,
      ...fileArguments,
    ],
    {
      env: {
        ...process.env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, '-r ts-node/register/transpile-only'].filter(p => p).join(' '),
      },
      stdio: 'inherit',
    },
  );
} catch (_) {}
