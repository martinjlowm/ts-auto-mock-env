"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var e_1, _a;
exports.__esModule = true;
var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");
var _b = __read(process.argv), fileArguments = _b.slice(2);
var _c = __read(fileArguments, 1), configFile = _c[0];
assert(configFile, '! You must specify a tsconfig file to generate mocks from!');
assert(fs.statSync(configFile));
var tsConfig = JSON.parse(fs.readFileSync(configFile).toString());
// The following runs two parses of ttsc with two different transformers. First,
// the type checker is used to expand globally declared variables from
// `globalThis` and the output is passed into `ts-auto-mock` to generate the
// runtime mocks.
//
// Hopefully, sometime in the future, this can be simplified by chaining
// transformers. But as of this writing, there's no TypeScript API to refresh
// the type checker state in-between custom transformers.
var baseCompilerOptions = tsConfig.compilerOptions || {};
var environmentConfig = __assign(__assign({}, tsConfig), { compilerOptions: __assign({}, baseCompilerOptions) });
var basePlugins = tsConfig.compilerOptions.plugins || [];
var temporaryFiles = [];
var configDirectory = path.dirname(configFile);
var temporaryEnvironmentConfigFile = path.join(configDirectory, "__env." + path.basename(configFile));
temporaryFiles.push(temporaryEnvironmentConfigFile);
var temporaryMockConfigFile = path.join(configDirectory, "__mock." + path.basename(configFile));
temporaryFiles.push(temporaryMockConfigFile);
var temporaryIntermediateInputFile = path.join(configDirectory, "__index.ts");
temporaryFiles.push(temporaryIntermediateInputFile);
fs.writeFileSync(temporaryEnvironmentConfigFile, JSON.stringify(__assign(__assign({}, environmentConfig), { compilerOptions: __assign(__assign({}, environmentConfig.compilerOptions), { plugins: __spread(basePlugins, [
            {
                transform: path.resolve(__dirname, '..', 'transformers', 'mock-generator.js')
            },
        ]) }) })));
fs.writeFileSync(temporaryMockConfigFile, JSON.stringify(__assign(__assign({}, environmentConfig), { compilerOptions: __assign(__assign({}, environmentConfig.compilerOptions), { plugins: __spread(basePlugins, [
            {
                transform: 'ts-auto-mock/transformer',
                cacheBetweenTests: false,
                features: ['overloads']
            },
        ]) }) })));
fs.writeFileSync(temporaryIntermediateInputFile, 'globalThis');
var temporaryIntermediateOutputFile = temporaryIntermediateInputFile.replace(/ts$/, 'js');
temporaryFiles.push(temporaryIntermediateOutputFile);
try {
    childProcess.execFileSync('ttsc', ['-p', temporaryEnvironmentConfigFile], { stdio: 'inherit' });
    var definitions = fs.readFileSync(temporaryIntermediateOutputFile).toString().split('\n');
    var typedDefinitions = definitions.map(function (definition) {
        var _a = __read(/^globalThis\.([^ ]+) = createMock\(\);$/mg.exec(definition) || [], 2), identifier = _a[1];
        if (!identifier) {
            return definition;
        }
        return definition.replace('createMock', "createMock<typeof " + identifier + ">");
    });
    fs.writeFileSync(temporaryIntermediateInputFile, typedDefinitions.join('\n'));
    childProcess.execFileSync('ttsc', ['-p', temporaryMockConfigFile], { stdio: 'inherit' });
    fs.copyFileSync(temporaryIntermediateOutputFile, path.join(configDirectory, 'index.js'));
}
catch (_) {
}
finally {
    try {
        for (var temporaryFiles_1 = __values(temporaryFiles), temporaryFiles_1_1 = temporaryFiles_1.next(); !temporaryFiles_1_1.done; temporaryFiles_1_1 = temporaryFiles_1.next()) {
            var temporaryFile = temporaryFiles_1_1.value;
            fs.unlinkSync(temporaryFile);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (temporaryFiles_1_1 && !temporaryFiles_1_1.done && (_a = temporaryFiles_1["return"])) _a.call(temporaryFiles_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
