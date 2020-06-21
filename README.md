# Environment mocking with TS auto mock

![Continuous Integration](https://github.com/martinjlowm/ts-auto-mock-env/workflows/Continuous%20Integration/badge.svg)

This project supplies an executable script to generate runtime mocks (powered by
[`ts-auto-mock`](https://github.com/Typescript-TDD/ts-auto-mock)) from
TypeScript declarations as supplied from a `tsconfig.json` using the `types`
option. This project may be used by,

1. package maintainers to supply pre-generated mocks for a release,
2. or an end-user to create mocks on-demand.

## Installation

- Yarn:
```
yarn add -D ts-auto-mock-env@github:martinjlowm/ts-auto-mock-env
```

- NPM:
```
npm i --save-dev martinjlowm/ts-auto-mock-env
```

## Usage

- Yarn:
```
yarn generate-mocks <path-to-tsconfig.json>
```

- NPM
```
npx generate-mocks <path-to-tsconfig.json>
```

The script generates an `index.js` with mocks for the global environment as
defined by your `tsconfig.json`.

For example, say you have a declaration set that injects into the global scope
of Node.js:

#### **`declaration.d.ts`**
```
declare function globalFunction(): void;
```

and a TypeScript config that references this file:

#### **`tsconfig.json`**
```
{
  ...
  "compilerOptions": {
    ...
    "types": ["<path-to-declaration.d.ts"],
    ...
  },
  ...
}
```

An `index.js` file will then be generated in the same directory as the
`tsconfig.json` with a `ts-auto-mock`-powered mock. This project does not allow
you to configure the generated mocks, instead, you would have to mock those
specific mocks yourself and mutate the property on `globalThis`, i.e.:
`globalThis.globalFunction = createMock<...>`.

Finally, you need to have `ts-auto-mock` installed to serve as a runtime for
your tests. Then, you may use `import` or `require` wherever you'd like, as long
as it's before your tests are initiated. For example, Jest provides a config
file which you can put these into. Another way is to add a require flag
`-r <path-to-the-tsconfig-directory>` to the Node.js process.
