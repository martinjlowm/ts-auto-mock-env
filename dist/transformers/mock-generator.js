"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var assert = require("assert");
var path = require("path");
var ts = require("typescript");
var visitor = function (program) {
    var checker = program.getTypeChecker();
    var _a = program.getCompilerOptions(), _b = _a.types, types = _b === void 0 ? [] : _b, configFilePath = _a.configFilePath;
    assert(typeof configFilePath === 'string', '! Expected configFilePath to be a string.');
    var typePaths = types.map(function (t) { return path.resolve(path.dirname(configFilePath), t); });
    var createMock = ts.createIdentifier('createMock');
    var importClause = ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamedImports([ts.createImportSpecifier(undefined, createMock)])), ts.createStringLiteral('ts-auto-mock'));
    return function (node) {
        if (!ts.isExpressionStatement(node)) {
            return node;
        }
        var identifier = node.expression;
        if (!ts.isIdentifier(identifier)) {
            return node;
        }
        if (identifier.text !== 'globalThis') {
            return node;
        }
        if (!node.getSourceFile()) {
            return node;
        }
        var globalThisType = checker.getTypeAtLocation(identifier);
        var declarationNames = checker.getPropertiesOfType(globalThisType)
            .map(function (property) { return property.valueDeclaration; })
            .filter(function (declaration) {
            return typePaths.some(function (path) { return declaration === null || declaration === void 0 ? void 0 : declaration.getSourceFile().fileName.startsWith(path); });
        })
            .filter(function (d) { return ts.isFunctionLike(d) || ts.isVariableDeclaration(d); })
            .map(function (d) { return d.name; })
            .filter(function (name) { return !!name && ts.isIdentifier(name); });
        return __spread([
            importClause
        ], declarationNames.map(function (name) {
            return ts.createExpressionStatement(ts.createAssignment(ts.createPropertyAccess(ts.createIdentifier(identifier.text), name), ts.createCall(createMock, [ts.createTypeQueryNode(name)], [])));
        }));
    };
};
function visitNodeAndChildren(node, context, visitor) {
    var visitedNode = visitor(node);
    if (!visitedNode) {
        return;
    }
    var evaluatedNodes = Array.isArray(visitedNode) ? visitedNode : [visitedNode];
    return evaluatedNodes.map(function (n) {
        return ts.visitEachChild(n, function (childNode) { return visitNodeAndChildren(childNode, context, visitor); }, context);
    });
}
var transformer = function (program) {
    var visitNode = visitor(program);
    return function (context) {
        return function (file) {
            return ts.visitNode(file, function (node) { return visitNodeAndChildren(node, context, visitNode); });
        };
    };
};
exports["default"] = transformer;
