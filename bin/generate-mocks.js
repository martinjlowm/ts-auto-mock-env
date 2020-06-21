const child_process = require('child_process');

const [,, ...fileArguments] = process.argv;

try {
  child_process.execFileSync(
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
