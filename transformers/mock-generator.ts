import assert = require('assert');
import path = require('path');

import ts = require('typescript');

const visitor: (program: ts.Program) => ts.Visitor = (program) => {
  const checker = program.getTypeChecker();

  const { types = [], configFilePath } = program.getCompilerOptions();

  assert(typeof configFilePath === 'string', '! Expected configFilePath to be a string.');

  const typePaths = types.map((t) => path.resolve(path.dirname(configFilePath), t));

  const createMock = ts.createIdentifier('createMock');
  const importClause = ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      undefined,
      ts.createNamedImports([ts.createImportSpecifier(undefined, createMock)]),
    ),
    ts.createStringLiteral('ts-auto-mock'),
  );

  return (node) => {
    if (!ts.isExpressionStatement(node)) {
      return node;
    }

    const identifier = node.expression;

    if (!ts.isIdentifier(identifier)) {
      return node;
    }

    if (identifier.text !== 'globalThis') {
      return node;
    }

    if (!node.getSourceFile()) {
      return node;
    }

    const globalThisType = checker.getTypeAtLocation(identifier);

    const declarationNames = checker.getPropertiesOfType(globalThisType)
      .map((property) => property.valueDeclaration)
      .filter((declaration) => {
        return typePaths.some((path) => declaration?.getSourceFile().fileName.startsWith(path));
      })
      .filter((d): d is ts.FunctionLike | ts.VariableDeclaration  => ts.isFunctionLike(d) || ts.isVariableDeclaration(d))
      .map((d) => d.name)
      .filter((name): name is ts.Identifier => !!name && ts.isIdentifier(name));

    return [
      importClause,
      ...declarationNames.map((name) => {
        return ts.createExpressionStatement(
          ts.createAssignment(
            ts.createPropertyAccess(ts.createIdentifier(identifier.text), name),
            ts.createCall(createMock, [ts.createTypeQueryNode(name)], []),
          ),
        );
      })
    ];
  };
}

function visitNodeAndChildren(node: ts.Node, context: ts.TransformationContext, visitor: ts.Visitor): ts.Node | ts.Node[] | undefined {
  const visitedNode = visitor(node);

  if (!visitedNode) {
    return;
  }

  const evaluatedNodes = Array.isArray(visitedNode) ? visitedNode : [visitedNode];

  return evaluatedNodes.map((n) => {
    return ts.visitEachChild(n, (childNode) => visitNodeAndChildren(childNode, context, visitor), context);
  });
}

const transformer: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile> = (program) => {
  const visitNode = visitor(program);
  return (context) => {
    return (file) => {
      return ts.visitNode(file, (node) => visitNodeAndChildren(node, context, visitNode));
    };
  };
};

export default transformer;
