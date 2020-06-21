import path from 'path';

import ts from 'typescript';

const visitor: (program: ts.Program) => ts.Visitor = (program) => {
  const checker = program.getTypeChecker();
  const declarationsDirectory = path.join(program.getCurrentDirectory(), 'declarations');

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

    const declarations = checker.getPropertiesOfType(globalThisType)
      .map((property) => property.valueDeclaration)
      .filter((declaration) => {
        return declaration?.getSourceFile().fileName.startsWith(declarationsDirectory);
      })
      .filter((declaration): declaration is ts.NamedDeclaration => !!(declaration as ts.NamedDeclaration).name);

    return [
      importClause,
      ...declarations.map((declaration) => {
        return ts.createExpressionStatement(
          ts.createAssignment(
            ts.createPropertyAccess(ts.createIdentifier(identifier.text), declaration.name),
            ts.createCall(createMock, [ts.createTypeQueryNode(declaration.name)], []),
          ),
        );
      })
    ];
  };
}

function visitNodeAndChildren<T extends ts.Node>(node: T, context: ts.TransformationContext, visitor: ts.Transformer<T>): T {
  return ts.visitEachChild(visitor(node), (childNode) => visitNodeAndChildren(childNode, context, visitor), context);
}

const transformer: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile> = (program) => {
  const printer = ts.createPrinter();
  const visitNode = visitor(program);
  return {
    before: (context) => {
      return (file) => {
        return visitNodeAndChildren(file, context, visitNode as ts.Transformer<ts.SourceFile>);
      };
    },
  };
};

export default transformer;
