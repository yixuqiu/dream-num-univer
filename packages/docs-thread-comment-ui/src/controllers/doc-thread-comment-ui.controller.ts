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

import { Disposable, ICommandService, Inject, LifecycleStages, OnLifecycle } from '@univerjs/core';
import { ComponentManager, IMenu2Service } from '@univerjs/ui';
import { CommentSingle } from '@univerjs/icons';
import { AddDocCommentComment } from '../commands/commands/add-doc-comment.command';
import { DocThreadCommentPanel } from '../views/doc-thread-comment-panel';
import { ShowCommentPanelOperation, StartAddCommentOperation, ToggleCommentPanelOperation } from '../commands/operations/show-comment-panel.operation';
import { DeleteDocCommentComment } from '../commands/commands/delete-doc-comment.command';
import { menuSchema } from './menu.schema';

@OnLifecycle(LifecycleStages.Rendered, DocThreadCommentUIController)
export class DocThreadCommentUIController extends Disposable {
    constructor(
        @ICommandService private readonly _commandService: ICommandService,
        @IMenu2Service private readonly _menu2Service: IMenu2Service,
        @Inject(ComponentManager) private readonly _componentManager: ComponentManager
    ) {
        super();
        this._initCommands();
        this._initMenus();
        this._initComponents();
    }

    private _initCommands() {
        [
            AddDocCommentComment,
            DeleteDocCommentComment,
            ShowCommentPanelOperation,
            StartAddCommentOperation,
            ToggleCommentPanelOperation,
        ].forEach((command) => {
            this.disposeWithMe(this._commandService.registerCommand(command));
        });
    }

    private _initMenus() {
        this._menu2Service.mergeMenu(menuSchema);
    }

    private _initComponents() {
        [DocThreadCommentPanel].forEach((comp) => {
            this.disposeWithMe(this._componentManager.register(comp.componentKey, comp));
        });

        this.disposeWithMe(this._componentManager.register('CommentSingle', CommentSingle));
    }
}
