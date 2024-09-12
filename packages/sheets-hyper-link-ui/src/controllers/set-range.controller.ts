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

import { BuildTextUtils, CustomRangeType, DataStreamTreeTokenType, Disposable, DOCS_NORMAL_EDITOR_UNIT_ID_KEY, generateRandomId, Inject, IUniverInstanceService, LifecycleStages, ObjectMatrix, OnLifecycle, Range, TextX, Tools } from '@univerjs/core';
import { IRenderManagerService } from '@univerjs/engine-render';
import { ClearSelectionAllCommand, ClearSelectionContentCommand, ClearSelectionFormatCommand, getSheetCommandTarget, SetRangeValuesCommand, SheetInterceptorService, SheetsSelectionsService } from '@univerjs/sheets';
import { AddHyperLinkMutation, HyperLinkModel, RemoveHyperLinkMutation } from '@univerjs/sheets-hyper-link';
import { IEditorBridgeService, SheetSkeletonManagerService } from '@univerjs/sheets-ui';
import type { IMutationInfo } from '@univerjs/core';
import type { ISetRangeValuesMutationParams } from '@univerjs/sheets';

@OnLifecycle(LifecycleStages.Starting, SheetHyperLinkSetRangeController)
export class SheetHyperLinkSetRangeController extends Disposable {
    constructor(
        @Inject(SheetInterceptorService) private readonly _sheetInterceptorService: SheetInterceptorService,
        @Inject(HyperLinkModel) private readonly _hyperLinkModel: HyperLinkModel,
        @Inject(SheetsSelectionsService) private readonly _selectionManagerService: SheetsSelectionsService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @IEditorBridgeService private readonly _editorBridgeService: IEditorBridgeService,
        @IRenderManagerService private readonly _renderManagerService: IRenderManagerService
    ) {
        super();

        this._initCommandInterceptor();
        this._initAfterEditor();
    }

    private _initCommandInterceptor() {
        this._initSetRangeValuesCommandInterceptor();
        this._initClearSelectionCommandInterceptor();
    }

    private _initSetRangeValuesCommandInterceptor() {
        this.disposeWithMe(this._sheetInterceptorService.interceptCommand({
            getMutations: (command) => {
                if (command.id === SetRangeValuesCommand.id) {
                    const params = command.params as ISetRangeValuesMutationParams;
                    const { unitId, subUnitId } = params;
                    const redos: IMutationInfo[] = [];
                    const undos: IMutationInfo[] = [];
                    if (params.cellValue) {
                        new ObjectMatrix(params.cellValue).forValue((row, col) => {
                            const link = this._hyperLinkModel.getHyperLinkByLocation(unitId, subUnitId, row, col);
                            if (link) {
                                // rich-text can store link in custom-range, don't save to link model
                                redos.push({
                                    id: RemoveHyperLinkMutation.id,
                                    params: {
                                        unitId,
                                        subUnitId,
                                        id: link.id,
                                    },
                                });

                                undos.push({
                                    id: AddHyperLinkMutation.id,
                                    params: {
                                        unitId,
                                        subUnitId,
                                        link,
                                    },
                                });
                            }
                        });
                    }

                    return {
                        undos,
                        redos,
                    };
                }
                return {
                    redos: [],
                    undos: [],
                };
            },
        }));
    }

    private _initClearSelectionCommandInterceptor() {
        this.disposeWithMe(this._sheetInterceptorService.interceptCommand({
            getMutations: (command) => {
                if (
                    command.id === ClearSelectionContentCommand.id ||
                    command.id === ClearSelectionAllCommand.id ||
                    command.id === ClearSelectionFormatCommand.id
                ) {
                    const redos: IMutationInfo[] = [];
                    const undos: IMutationInfo[] = [];
                    const selection = this._selectionManagerService.getCurrentLastSelection();
                    const target = getSheetCommandTarget(this._univerInstanceService);
                    if (selection && target) {
                        const { unitId, subUnitId } = target;
                        Range.foreach(selection.range, (row, col) => {
                            const link = this._hyperLinkModel.getHyperLinkByLocation(unitId, subUnitId, row, col);
                            if (link) {
                                redos.push({
                                    id: RemoveHyperLinkMutation.id,
                                    params: {
                                        unitId,
                                        subUnitId,
                                        id: link.id,
                                    },
                                });
                                undos.push({
                                    id: AddHyperLinkMutation.id,
                                    params: {
                                        unitId,
                                        subUnitId,
                                        link,
                                    },
                                });
                            }
                        });
                    }

                    return {
                        redos,
                        undos,
                    };
                }

                return {
                    redos: [],
                    undos: [],
                };
            },
        }));
    }

    private _initAfterEditor() {
        this.disposeWithMe(this._editorBridgeService.interceptor.intercept(this._editorBridgeService.interceptor.getInterceptPoints().AFTER_CELL_EDIT, {
            handler: (cell, context, next) => {
                if (!cell || cell.p) {
                    return next(cell);
                }

                if (typeof cell.v === 'string' && Tools.isLegalUrl(cell.v) && cell.v[cell.v.length - 1] !== ' ') {
                    const { unitId, subUnitId } = context;
                    const renderer = this._renderManagerService.getRenderById(unitId);
                    const skeleton = renderer?.with(SheetSkeletonManagerService).getWorksheetSkeleton(subUnitId);
                    if (!skeleton) {
                        return next(cell);
                    }
                    const doc = skeleton.skeleton.getBlankCellDocumentModel(cell);
                    if (!doc.documentModel) {
                        return next(cell);
                    }
                    const textX = BuildTextUtils.selection.replace({
                        selection: {
                            startOffset: 0,
                            endOffset: cell.v.length,
                            collapsed: false,
                        },
                        body: {
                            dataStream: `${DataStreamTreeTokenType.CUSTOM_RANGE_START}${cell.v}${DataStreamTreeTokenType.CUSTOM_RANGE_END}`,
                            customRanges: [{
                                startIndex: 0,
                                endIndex: cell.v.length,
                                rangeId: generateRandomId(),
                                rangeType: CustomRangeType.HYPERLINK,
                                properties: {
                                    url: cell.v,
                                },
                            }],
                        },
                        doc: doc.documentModel,
                    });
                    if (!textX) {
                        return next(cell);
                    }
                    const body = doc.documentModel.getBody()!;
                    TextX.apply(body, textX.serialize());
                    return next({
                        ...cell,
                        p: {
                            id: DOCS_NORMAL_EDITOR_UNIT_ID_KEY,
                            body,
                            documentStyle: {
                                pageSize: {
                                    width: Infinity,
                                    height: Infinity,
                                },
                            },
                        },
                    });
                }
                return next(cell);
            },
        }));
    }
}
