import {IPluginContext} from '@tarojs/service';
import * as path from 'path';
import * as parser from "@babel/parser";
// @ts-ignore
import traverse from "@babel/traverse";
import generator from '@babel/generator';
import * as t from "@babel/types";

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
		fn() {
			const {fs} = ctx.helper;
			const {sourcePath, appPath} = ctx.paths;
			const {name} = ctx.runOpts.options;
			const areaDir = 'buildAreas';
			const configFileName = 'area-config.ts';
			const themeFileName = 'area-theme.scss';
			const logoFileName = 'logo.png';
			console.log(`开始${name}地区差异化资源处理`);
			const sourceConfigPath = path.join(appPath, areaDir, name, configFileName);
			const sourceThemeFilePath = path.join(appPath, areaDir, name, themeFileName);
			const sourceLogoFilePath = path.join(appPath, areaDir, name, logoFileName);
			const buildIndexConfigFilePath = path.join(appPath, 'config/index.js');
			const targetConfigPath = path.join(sourcePath, configFileName);
			const targetThemePath = path.join(sourcePath, themeFileName);
			const targetLogoFilePath = path.join(sourcePath, 'assets', 'images', logoFileName);
			const code = fs.readFileSync(sourceConfigPath).toString();
			const parserResult = parser.parse(code, {
				sourceType: 'module',
				plugins: [
					'typescript',
					'asyncGenerators',
					'bigInt',
					'classProperties',
					'classPrivateProperties',
					'classPrivateMethods',
					'decorators-legacy',
					'doExpressions',
					'dynamicImport',
					'exportDefaultFrom',
					'exportNamespaceFrom',
					'functionBind',
					'functionSent',
					'importMeta',
					'logicalAssignment',
					'nullishCoalescingOperator',
					'numericSeparator',
					'objectRestSpread',
					'optionalCatchBinding',
					'optionalChaining',
					'partialApplication',
					'throwExpressions',
					'topLevelAwait'
				]
			});
			parserResult.program.body.forEach(item => {
				if (item['source']?.value?.startsWith('../../src/')) {
					item['source'].value = item['source'].value.replace('../../src/', './');
				}
			});
			parserResult.program.body[0]['source'].value = './area-config-template';
			const newConfigTS = generator(parserResult, {retainLines: false});
			fs.writeFileSync(targetConfigPath, newConfigTS.code);
			
			const buildIndexConfigCode = fs.readFileSync(buildIndexConfigFilePath).toString();
			const buildIndexConfigParserResult = parser.parse(buildIndexConfigCode, {
				sourceType: 'module',
				plugins: [
					'typescript',
					'asyncGenerators',
					'bigInt',
					'classProperties',
					'classPrivateProperties',
					'classPrivateMethods',
					'decorators-legacy',
					'doExpressions',
					'dynamicImport',
					'exportDefaultFrom',
					'exportNamespaceFrom',
					'functionBind',
					'functionSent',
					'importMeta',
					'logicalAssignment',
					'nullishCoalescingOperator',
					'numericSeparator',
					'objectRestSpread',
					'optionalCatchBinding',
					'optionalChaining',
					'partialApplication',
					'throwExpressions',
					'topLevelAwait'
				]
			});
			traverse(buildIndexConfigParserResult, {
				ObjectProperty(configProperty) {
					if (configProperty.node.key.name === 'defineConstants') {
						configProperty.node.value.properties = [];
					}
				}
			});
			traverse(parserResult, {
				ObjectProperty(p) {
					if (p.node.key.name === 'appIdMap') {
						p.node.value.properties?.forEach(property => {
							if (property.key.name === 'weapp') {
								const projectConfigJsonFilePath = path.join(appPath, 'project.config.json');
								const fileContent = fs.readFileSync(projectConfigJsonFilePath);
								const projectConfig = JSON.parse(fileContent);
								projectConfig.appid = property.value.value;
								fs.writeFileSync(projectConfigJsonFilePath, JSON.stringify(projectConfig, null, '\t'));
							} else if (property.key.name === 'toutiao') {
								const projectConfigJsonFilePath = path.join(appPath, 'project.tt.json');
								const fileContent = fs.readFileSync(projectConfigJsonFilePath);
								const projectConfig = JSON.parse(fileContent);
								projectConfig.appid = property.value.value;
								fs.writeFileSync(projectConfigJsonFilePath, JSON.stringify(projectConfig, null, '\t'));
							}
						});
					}
					if (p.node.key.name === 'defineConstants') {
						if (p.node.value.properties?.length > 0) {
							traverse(buildIndexConfigParserResult, {
								ObjectProperty(configProperty) {
									if (configProperty.node.key.name === 'defineConstants') {
										configProperty.node.value.properties = p.node.value.properties;
									}
								}
							});
						}
					}
				},
			});
			const newBuildIndexConfigCode = generator(buildIndexConfigParserResult, {retainLines: false});
			fs.writeFileSync(buildIndexConfigFilePath, newBuildIndexConfigCode.code);
			fs.copyFileSync(sourceThemeFilePath, targetThemePath);
			fs.copyFileSync(sourceLogoFilePath, targetLogoFilePath);
			console.log(`处理完成！`);
		}
	});
}
