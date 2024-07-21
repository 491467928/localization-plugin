import {IPluginContext} from '@tarojs/service';
import * as path from 'path';
import * as parser from "@babel/parser";
// @ts-ignore
import traverse from "@babel/traverse";
import generator from '@babel/generator';
import * as t from "@babel/types";

const areaListFileTemplate = `import { AreaConfigTemplate } from "./area-config-template";
export const AreaConfigList: AreaConfigTemplate[]=[$replace]`;

export default (ctx: IPluginContext) => {
	ctx.registerCommand({
		// 命令名
		name: 'localization',
		// 执行 taro upload --help 时输出的 options 信息
		optionsMap: {
			'--name': '地区名',
			'--sassH5': 'sass'
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
			const targetLogoDir = path.join(sourcePath, 'assets/images/logo');
			if (!fs.existsSync(targetLogoDir)) {
				fs.mkdirSync(targetLogoDir, {recursive: true});
			}
			fs.rmSync(targetLogoDir, {recursive: true});
			fs.mkdirSync(targetLogoDir,{recursive: true});
			const sourceConfigPath = path.join(appPath, areaDir, name, configFileName);
			const sourceThemeFilePath = path.join(appPath, areaDir, name, themeFileName);
			const sourceLogoFilePath = path.join(appPath, areaDir, name, logoFileName);
			const buildIndexConfigFilePath = path.join(appPath, 'config/index.js');
			const targetConfigPath = path.join(sourcePath, configFileName);
			const targetThemePath = path.join(sourcePath, themeFileName);
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
			let appId = '';
			traverse(parserResult, {
				ObjectProperty(p) {
					if (p.node.key.name === 'appIdMap') {
						p.node.value.properties?.forEach(property => {
							if (property.key.name === 'weapp') {
								const projectConfigJsonFilePath = path.join(appPath, 'project.config.json');
								const fileContent = fs.readFileSync(projectConfigJsonFilePath);
								const projectConfig = JSON.parse(fileContent);
								projectConfig.appid = property.value.value;
								appId = property.value.value;
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
			const targetLogoFilePath = path.join(sourcePath, 'assets/images/logo', appId + '.png');
			fs.copyFileSync(sourceLogoFilePath, targetLogoFilePath);
			if (ctx.runOpts.options.sassH5) {
				sassH5FileGenerate(fs, appPath, sourcePath);
			} else {
				const defaultAreaListContent = areaListFileTemplate.replace('$replace', '');
				const targetConfigListFilePath = path.join(sourcePath, 'area-config-list.ts');
				fs.writeFileSync(targetConfigListFilePath, defaultAreaListContent);
			}
			console.log(`处理完成！`);
		}
	});
}

function sassH5FileGenerate(fs: any, appPath: string, sourcePath: string) {
	const buildAreaDir = path.join(appPath, 'buildAreas');
	const files = fs.readdirSync(buildAreaDir);
	const targetLogoDir = path.join(sourcePath, 'assets/images/logo');
	const areaConfigContentList: string[] = [];
	const themeContentList: string[] = [];
	files.forEach(child => {
		const childPath = path.join(buildAreaDir, child);
		const stat = fs.statSync(childPath);
		if (!stat.isDirectory()) {
			return;
		}
		const configFileName = 'area-config.ts';
		const themeFileName = 'area-theme.scss';
		const logoFileName = 'logo.png';
		const sourceConfigPath = path.join(childPath, configFileName);
		const sourceThemeFilePath = path.join(childPath, themeFileName);
		const sourceLogoFilePath = path.join(childPath, logoFileName);
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
		let isSass = false;
		let appId = '';
		traverse(parserResult, {
			ObjectProperty(p) {
				if (p.node.key.name === 'appIdMap') {
					p.node.value.properties?.forEach(property => {
						if (property.key.name === 'weapp') {
							appId = property.value.value;
						}
					});
				} else if (p.node.key.name === 'serverBaseUrl') {
					isSass = p.node.value.value === 'https://saas.itour365.com';
				}
			},
		});
		if (!isSass) {
			return;
		}
		
		let areaConfigTSContent: string = fs.readFileSync(sourceConfigPath).toString();
		areaConfigTSContent = areaConfigTSContent.replace('export const AreaConfig: AreaConfigTemplate =', '');
		areaConfigTSContent = areaConfigTSContent.replace('import {AreaConfigTemplate} from "../../src/area-config-template";', '');
		const startIndex = areaConfigTSContent.indexOf('{');
		areaConfigTSContent = areaConfigTSContent.substring(startIndex);
		areaConfigTSContent = areaConfigTSContent.substring(0, areaConfigTSContent.length - 1);
		areaConfigContentList.push(areaConfigTSContent);
		let themeContent: string = fs.readFileSync(sourceThemeFilePath).toString();
		themeContent = themeContent.replace(':root, page, .custom-tab-bar', `.${appId}:root`);
		themeContentList.push(themeContent);
		const targetLogoPath = path.join(targetLogoDir, appId + '.png');
		fs.copyFileSync(sourceLogoFilePath, targetLogoPath);
	});
	const configListContent = areaListFileTemplate.replace('$replace', areaConfigContentList.join(','));
	const targetConfigListFilePath = path.join(sourcePath, 'area-config-list.ts');
	fs.writeFileSync(targetConfigListFilePath, configListContent);
	const targetThemeFilePath = path.join(sourcePath, 'area-theme.scss');
	fs.writeFileSync(targetThemeFilePath, themeContentList.join('\n'));
}