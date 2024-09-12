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

import { DataValidationType, Disposable, Inject, Injector, LifecycleStages, OnLifecycle, Range, Rectangle } from '@univerjs/core';
import type { IAutoFillLocation, ISheetAutoFillHook } from '@univerjs/sheets-ui';
import { APPLY_TYPE, getAutoFillRepeatRange, IAutoFillService, virtualizeDiscreteRanges } from '@univerjs/sheets-ui';
import { DATA_VALIDATION_PLUGIN_NAME } from '../common/const';
import { getDataValidationDiffMutations } from '../commands/commands/data-validation.command';
import { SheetDataValidationModel } from '../models/sheet-data-validation-model';

@OnLifecycle(LifecycleStages.Ready, DataValidationAutoFillController)
export class DataValidationAutoFillController extends Disposable {
    constructor(
        @IAutoFillService private readonly _autoFillService: IAutoFillService,
        @Inject(SheetDataValidationModel) private readonly _dataValidationModel: SheetDataValidationModel,
        @Inject(Injector) private readonly _injector: Injector
    ) {
        super();
        this._initAutoFill();
    }

    // eslint-disable-next-line max-lines-per-function
    private _initAutoFill() {
        const noopReturnFunc = () => ({ redos: [], undos: [] });

        const generalApplyFunc = (location: IAutoFillLocation, applyType: APPLY_TYPE) => {
            const { source: sourceRange, target: targetRange, unitId, subUnitId } = location;
            const ruleMatrixCopy = this._dataValidationModel.getRuleObjectMatrix(unitId, subUnitId).clone();

            const virtualRange = virtualizeDiscreteRanges([sourceRange, targetRange]);
            const [vSourceRange, vTargetRange] = virtualRange.ranges;
            const { mapFunc } = virtualRange;
            const sourceStartCell = {
                row: vSourceRange.startRow,
                col: vSourceRange.startColumn,
            };
            const repeats = getAutoFillRepeatRange(vSourceRange, vTargetRange);
            repeats.forEach((repeat) => {
                const targetStartCell = repeat.repeatStartCell;
                const relativeRange = repeat.relativeRange;
                const sourceRange = {
                    startRow: sourceStartCell.row,
                    startColumn: sourceStartCell.col,
                    endColumn: sourceStartCell.col,
                    endRow: sourceStartCell.row,
                };
                const targetRange = {
                    startRow: targetStartCell.row,
                    startColumn: targetStartCell.col,
                    endColumn: targetStartCell.col,
                    endRow: targetStartCell.row,
                };
                Range.foreach(relativeRange, (row, col) => {
                    const sourcePositionRange = Rectangle.getPositionRange(
                        {
                            startRow: row,
                            startColumn: col,
                            endColumn: col,
                            endRow: row,
                        },
                        sourceRange
                    );
                    const { row: sourceRow, col: sourceCol } = mapFunc(sourcePositionRange.startRow, sourcePositionRange.startColumn);
                    const ruleId = this._dataValidationModel.getRuleIdByLocation(unitId, subUnitId, sourceRow, sourceCol);
                    if (ruleId) {
                        const targetPositionRange = Rectangle.getPositionRange(
                            {
                                startRow: row,
                                startColumn: col,
                                endColumn: col,
                                endRow: row,
                            },
                            targetRange
                        );
                        const { row: targetRow, col: targetCol } = mapFunc(targetPositionRange.startRow, targetPositionRange.startColumn);

                        ruleMatrixCopy.setValue(targetRow, targetCol, ruleId);
                    }
                });
            });

            const diffs = ruleMatrixCopy.diff(this._dataValidationModel.getRules(unitId, subUnitId));
            const { redoMutations, undoMutations } = getDataValidationDiffMutations(unitId, subUnitId, diffs, this._injector, 'patched', applyType === APPLY_TYPE.ONLY_FORMAT);
            return {
                undos: undoMutations,
                redos: redoMutations,
            };
        };
        const disabledDataVallation = [
            DataValidationType.CHECKBOX,
        ];
        const hook: ISheetAutoFillHook = {
            id: DATA_VALIDATION_PLUGIN_NAME,
            onBeforeFillData: (location) => {
                const { source: sourceRange, unitId, subUnitId } = location;
                for (const row of sourceRange.rows) {
                    for (const col of sourceRange.cols) {
                        const dv = this._dataValidationModel.getRuleByLocation(unitId, subUnitId, row, col);
                        if (dv && disabledDataVallation.indexOf(dv.type) > -1) {
                            this._autoFillService.setDisableApplyType(APPLY_TYPE.SERIES, true);
                            return;
                        }
                    }
                }
            },
            onFillData: (location, direction, applyType) => {
                if (
                    applyType === APPLY_TYPE.COPY ||
                    applyType === APPLY_TYPE.ONLY_FORMAT ||
                    applyType === APPLY_TYPE.SERIES
                ) {
                    return generalApplyFunc(location, applyType);
                }

                return noopReturnFunc();
            },
            onAfterFillData: () => {
            },
        };
        this.disposeWithMe(this._autoFillService.addHook(hook));
    }
}
