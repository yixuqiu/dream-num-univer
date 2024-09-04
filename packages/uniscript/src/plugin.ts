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

import { IConfigService, Inject, Injector, Plugin } from '@univerjs/core';
import type { Dependency } from '@univerjs/core';

import { UniscriptController } from './controllers/uniscript.controller';
import { ScriptEditorService } from './services/script-editor.service';
import { IUniscriptExecutionService, UniscriptExecutionService } from './services/script-execution.service';
import { ScriptPanelService } from './services/script-panel.service';
import type { IUniverUniscriptConfig } from './controllers/config.schema';
import { defaultPluginConfig, PLUGIN_CONFIG_KEY } from './controllers/config.schema';

const PLUGIN_NAME = 'uniscript';

export class UniverUniscriptPlugin extends Plugin {
    static override pluginName = PLUGIN_NAME;

    constructor(
        private readonly _config: Partial<IUniverUniscriptConfig> = defaultPluginConfig,
        @Inject(Injector) protected override _injector: Injector,
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
        const injector = this._injector;
        const dependencies: Dependency[] = [
            [UniscriptController],
            [ScriptEditorService],
            [ScriptPanelService],
        ];

        dependencies.forEach((d) => injector.add(d));

        this.registerExecution();
    }

    /**
     * Allows being overridden, replacing with a new UniscriptExecutionService.
     */
    registerExecution(): void {
        this._injector.add([IUniscriptExecutionService, { useClass: UniscriptExecutionService }]);
    }
}
