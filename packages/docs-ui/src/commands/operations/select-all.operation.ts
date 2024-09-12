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

import { CommandType, IUniverInstanceService } from '@univerjs/core';
import { DocSelectionManagerService } from '@univerjs/docs';
import type { ICommand } from '@univerjs/core';

interface ISelectAllOperationParams { }

export const SelectAllOperation: ICommand<ISelectAllOperationParams> = {
    id: 'doc.operation.select-all',
    type: CommandType.COMMAND,
    handler: async (accessor) => {
        const univerInstanceService = accessor.get(IUniverInstanceService);
        const docSelectionManagerService = accessor.get(DocSelectionManagerService);
        const docDataModel = univerInstanceService.getCurrentUniverDocInstance();
        const activeTextRange = docSelectionManagerService.getActiveTextRange();
        if (docDataModel == null || activeTextRange == null) {
            return false;
        }

        const { segmentId } = activeTextRange;
        const prevBody = docDataModel.getSelfOrHeaderFooterModel(segmentId).getSnapshot().body;
        if (prevBody == null) {
            return false;
        }

        const textRanges = [
            {
                startOffset: 0,
                endOffset: prevBody.dataStream.length - 2,
            },
        ];

        docSelectionManagerService.replaceTextRanges(textRanges, false);
        return true;
    },
};
