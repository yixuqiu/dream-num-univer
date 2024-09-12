/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Dependency } from '@univerjs/core';
import { DependentOn, IConfigService, Inject, Injector, Plugin, UniverInstanceType } from '@univerjs/core';
import { UniverSheetsHyperLinkPlugin } from '@univerjs/sheets-hyper-link';
import { IRenderManagerService } from '@univerjs/engine-render';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { SheetsHyperLinkRemoveSheetController } from './controllers/remove-sheet.controller';
import { SheetsHyperLinkRenderController, SheetsHyperLinkRenderManagerController } from './controllers/render-controllers/render.controller';
import { SheetsHyperLinkPopupService } from './services/popup.service';
import { SheetsHyperLinkResolverService } from './services/resolver.service';
import { SheetHyperLinkSetRangeController } from './controllers/set-range.controller';
import { SheetsHyperLinkPopupController } from './controllers/popup.controller';
import { SheetsHyperLinkUIController } from './controllers/ui.controller';
import { SHEET_HYPER_LINK_UI_PLUGIN } from './types/const';
import { SheetsHyperLinkAutoFillController } from './controllers/auto-fill.controller';
import { SheetsHyperLinkCopyPasteController } from './controllers/copy-paste.controller';
import { SheetHyperLinkUrlController } from './controllers/url.controller';
import { SheetsHyperLinkPermissionController } from './controllers/hyper-link-permission.controller';
import { SheetsHyperLinkSidePanelService } from './services/side-panel.service';
import type { IUniverSheetsHyperLinkUIConfig } from './controllers/config.schema';
import { defaultPluginConfig, PLUGIN_CONFIG_KEY } from './controllers/config.schema';
import { SheetsHyperLinkRichTextRefRangeController } from './controllers/rich-text-ref-range.controller';

@DependentOn(UniverSheetsHyperLinkPlugin, UniverDocsUIPlugin)
export class UniverSheetsHyperLinkUIPlugin extends Plugin {
    static override pluginName: string = SHEET_HYPER_LINK_UI_PLUGIN;
    static override type = UniverInstanceType.UNIVER_SHEET;

    constructor(
        private readonly _config: Partial<IUniverSheetsHyperLinkUIConfig> = defaultPluginConfig,
        @Inject(Injector) protected override _injector: Injector,
        @IRenderManagerService private readonly _renderManagerService: IRenderManagerService,
        @IConfigService private readonly _configService: IConfigService
    ) {
        super();

        // Manage the plugin configuration.
        const { menu, ...rest } = this._config;
        if (menu) {
            this._configService.setConfig('menu', menu, { merge: true });
        }
        this._configService.setConfig(PLUGIN_CONFIG_KEY, rest);
    }

    override onStarting(): void {
        const dependencies: Dependency[] = [
            [SheetsHyperLinkResolverService],
            [SheetsHyperLinkPopupService],
            [SheetsHyperLinkSidePanelService],

            [SheetsHyperLinkRemoveSheetController],
            [SheetsHyperLinkRenderManagerController],
            [SheetHyperLinkSetRangeController],
            [SheetsHyperLinkPopupController],
            [SheetsHyperLinkUIController],
            [SheetsHyperLinkAutoFillController],
            [SheetsHyperLinkCopyPasteController],
            [SheetsHyperLinkPermissionController],
            [SheetHyperLinkUrlController],
            [SheetsHyperLinkRichTextRefRangeController],
        ];

        dependencies.forEach((dep) => this._injector.add(dep));
    }

    override onReady(): void {
        const renderDependencies: Dependency[] = [
            [SheetsHyperLinkRenderController],
        ];

        renderDependencies.forEach((d) => this._renderManagerService.registerRenderModule(UniverInstanceType.UNIVER_SHEET, d));
    }
}
