import {IPluginContext} from '@tarojs/service';
import * as path from 'path';
import * as parser from "@babel/parser";
// @ts-ignore
import traverse from "@babel/traverse";
import generator from '@babel/generator';

export default (ctx: IPluginContext) => {
    ctx.registerCommand({
        // 命令名
        name: 'localization',
        // 执行 taro upload --help 时输出的 options 信息
        optionsMap: {
            '--name': '地区名'
        },
        // 执行 taro upload --help 时输出的使用例子的信息
        synopsisList: [
            'taro localization --name kylintrip'
        ],
        async fn() {
            const {fs} = ctx.helper;
            const {sourcePath} = ctx.paths;
            const {name} = ctx.runOpts;
            const entryPath = path.join(sourcePath, 'ttt.js');
             const s = await import(entryPath);
             console.log('ddd', s.default);
            //
            // const code = fs.readFileSync(entryPath).toString();
            // const parserResult = parser.parse(code, {
            //     sourceType: 'module',
            //     plugins: [
            //         'typescript',
            //         'asyncGenerators',
            //         'bigInt',
            //         'classProperties',
            //         'classPrivateProperties',
            //         'classPrivateMethods',
            //         'decorators-legacy',
            //         'doExpressions',
            //         'dynamicImport',
            //         'exportDefaultFrom',
            //         'exportNamespaceFrom',
            //         'functionBind',
            //         'functionSent',
            //         'importMeta',
            //         'logicalAssignment',
            //         'nullishCoalescingOperator',
            //         'numericSeparator',
            //         'objectRestSpread',
            //         'optionalCatchBinding',
            //         'optionalChaining',
            //         'partialApplication',
            //         'throwExpressions',
            //         'topLevelAwait'
            //     ]
            // });
            // traverse(parserResult, {
            //     ObjectExpression(item: any) {
            //         if (item.parent.key?.name === 'tabBar') {
            //             console.log('key:', item.parent.key?.name);
            //             item.node.properties.forEach(p => {
            //                 if (p.key.name === 'color') {
            //                     p.value.value = '#333333';
            //                 }
            //             });
            //             console.log('properties):', item.node.properties);
            //         }
            //
            //     }
            // });
            // const s = generator(parserResult, {retainLines: true});
            // fs.writeFileSync(path.join(sourcePath, 'app1.config.ts'),
            //     s.code
            // );
        }
    });
}
