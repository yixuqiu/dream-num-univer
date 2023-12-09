import type { ICommand } from '@univerjs/core';
import { BooleanNumber, CommandType, ICommandService, IUndoRedoService, IUniverInstanceService } from '@univerjs/core';
import type { IAccessor } from '@wendellhu/redi';

import type { ISetWorksheetHideMutationParams } from '../mutations/set-worksheet-hide.mutation';
import { SetWorksheetHideMutation, SetWorksheetHideMutationFactory } from '../mutations/set-worksheet-hide.mutation';
import type { ISetWorksheetActiveOperationParams } from '../operations/set-worksheet-active.operation';
import {
    SetWorksheetActiveOperation,
    // SetWorksheetUnActivateMutationFactory,
} from '../operations/set-worksheet-active.operation';

export interface ISetWorksheetShowCommandParams {
    value?: string;
}

export const SetWorksheetShowCommand: ICommand = {
    type: CommandType.COMMAND,
    id: 'sheet.command.set-worksheet-show',

    handler: async (accessor: IAccessor, params?: ISetWorksheetShowCommandParams) => {
        const commandService = accessor.get(ICommandService);
        const undoRedoService = accessor.get(IUndoRedoService);
        const univerInstanceService = accessor.get(IUniverInstanceService);

        const workbookId = univerInstanceService.getCurrentUniverSheetInstance().getUnitId();
        let worksheetId = univerInstanceService
            .getCurrentUniverSheetInstance()

            .getActiveSheet()
            .getSheetId();

        if (params) {
            worksheetId = params.value ?? worksheetId;
        }

        const workbook = univerInstanceService.getUniverSheetInstance(workbookId);
        if (!workbook) return false;
        const worksheet = workbook.getSheetBySheetId(worksheetId);
        if (!worksheet) return false;

        const hidden = worksheet.getConfig().hidden;
        if (hidden === BooleanNumber.FALSE) return false;

        const redoMutationParams: ISetWorksheetHideMutationParams = {
            workbookId,
            worksheetId,
            hidden: BooleanNumber.FALSE,
        };

        const undoMutationParams = SetWorksheetHideMutationFactory(accessor, redoMutationParams);
        const result = commandService.syncExecuteCommand(SetWorksheetHideMutation.id, redoMutationParams);

        const activeSheetMutationParams: ISetWorksheetActiveOperationParams = {
            workbookId,
            worksheetId,
        };

        // const unActiveMutationParams = SetWorksheetUnActivateMutationFactory(accessor, activeSheetMutationParams);
        const activeResult = commandService.syncExecuteCommand(
            SetWorksheetActiveOperation.id,
            activeSheetMutationParams
        );

        if (result && activeResult) {
            undoRedoService.pushUndoRedo({
                unitID: workbookId,
                undoMutations: [
                    { id: SetWorksheetHideMutation.id, params: undoMutationParams },
                    // { id: SetWorksheetActiveOperation.id, params: unActiveMutationParams },
                ],
                redoMutations: [
                    // { id: SetWorksheetActiveOperation.id, params: activeSheetMutationParams },
                    { id: SetWorksheetHideMutation.id, params: redoMutationParams },
                ],
            });
            return true;
        }

        return false;
    },
};
