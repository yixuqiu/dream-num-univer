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

import { Disposable, ICommandService, Inject, Injector, LifecycleStages, OnLifecycle } from '@univerjs/core';
import { ComponentManager, IMenu2Service } from '@univerjs/ui';

import { ConfirmOperation } from '../commands/operations/confirm.operation';
import { DialogOperation } from '../commands/operations/dialog.operation';
import { LocaleOperation } from '../commands/operations/locale.operation';
import { MessageOperation } from '../commands/operations/message.operation';
import { NotificationOperation } from '../commands/operations/notification.operation';
import { SaveSnapshotOptions } from '../commands/operations/save-snapshot.operations';
import { SetEditable } from '../commands/operations/set.editable.operation';
import { SidebarOperation } from '../commands/operations/sidebar.operation';
import { ThemeOperation } from '../commands/operations/theme.operation';
import { TestEditorContainer } from '../views/test-editor/TestTextEditor';
import { TEST_EDITOR_CONTAINER_COMPONENT } from '../views/test-editor/component-name';

// @ts-ignore
import VueI18nIcon from '../components/VueI18nIcon.vue';

import { CreateEmptySheetCommand, DisposeCurrentUnitCommand, DisposeUniverCommand } from '../commands/commands/unit.command';
import { CreateFloatDomCommand } from '../commands/commands/float-dom.command';
import { ImageDemo } from '../components/Image';
import { ChangeUserCommand } from '../commands/operations/change-user.operation';
import { ShowCellContentOperation } from '../commands/operations/cell.operation';
import { RecordController } from './local-save/record.controller';
import { ExportController } from './local-save/export.controller';
import { menuSchema } from './menu.schema';

@OnLifecycle(LifecycleStages.Ready, DebuggerController)
export class DebuggerController extends Disposable {
    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @IMenu2Service private readonly _menu2Service: IMenu2Service,
        @ICommandService private readonly _commandService: ICommandService,
        @Inject(ComponentManager) private readonly _componentManager: ComponentManager
    ) {
        super();

        this._initializeMenu();
        this._initCustomComponents();

        [
            LocaleOperation,
            ThemeOperation,
            NotificationOperation,
            DialogOperation,
            ConfirmOperation,
            MessageOperation,
            SidebarOperation,
            SetEditable,
            SaveSnapshotOptions,
            DisposeUniverCommand,
            DisposeCurrentUnitCommand,
            CreateEmptySheetCommand,
            CreateFloatDomCommand,
            ChangeUserCommand,
            ShowCellContentOperation,
        ].forEach((command) => this.disposeWithMe(this._commandService.registerCommand(command)));

        this._injector.add([ExportController]);
        this._injector.add([RecordController]);
    }

    private _initializeMenu() {
        this._menu2Service.mergeMenu(menuSchema);
    }

    private _initCustomComponents(): void {
        const componentManager = this._componentManager;
        this.disposeWithMe(componentManager.register(TEST_EDITOR_CONTAINER_COMPONENT, TestEditorContainer));
        this.disposeWithMe(componentManager.register('VueI18nIcon', VueI18nIcon, {
            framework: 'vue3',
        }));
        this.disposeWithMe(componentManager.register('ImageDemo', ImageDemo));
    }
}
