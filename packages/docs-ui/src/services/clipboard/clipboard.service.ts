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

import type { ICustomRange, IDisposable, IDocumentBody, IDocumentData, IParagraph, Nullable } from '@univerjs/core';
import { createIdentifier, CustomRangeType, DataStreamTreeTokenType, Disposable, DOC_RANGE_TYPE, DOCS_NORMAL_EDITOR_UNIT_ID_KEY, generateRandomId, getBodySlice, ICommandService, ILogService, Inject, IUniverInstanceService, normalizeBody, SliceBodyType, toDisposable, Tools, UniverInstanceType } from '@univerjs/core';
import { HTML_CLIPBOARD_MIME_TYPE, IClipboardInterfaceService, PLAIN_TEXT_CLIPBOARD_MIME_TYPE } from '@univerjs/ui';

import type { IRectRangeWithStyle, ITextRangeWithStyle } from '@univerjs/engine-render';
import { DocSelectionManagerService } from '@univerjs/docs';
import { getCursorWhenDelete } from '../../commands/commands/delete.command';
import { CutContentCommand, InnerPasteCommand } from '../../commands/commands/clipboard.inner.command';
import { getDeleteSelection } from '../../basics/selection';
import { copyCustomRange } from '../../basics/custom-range';
import { copyContentCache, extractId, genId } from './copy-content-cache';
import { HtmlToUDMService } from './html-to-udm/converter';
import PastePluginLark from './html-to-udm/paste-plugins/plugin-lark';
import PastePluginWord from './html-to-udm/paste-plugins/plugin-word';
import PastePluginUniver from './html-to-udm/paste-plugins/plugin-univer';
import { UDMToHtmlService } from './udm-to-html/convertor';

HtmlToUDMService.use(PastePluginWord);
HtmlToUDMService.use(PastePluginLark);
HtmlToUDMService.use(PastePluginUniver);

export interface IClipboardPropertyItem { }

export interface IDocClipboardHook {
    onCopyProperty?(start: number, end: number): IClipboardPropertyItem;
    onCopyContent?(start: number, end: number): string;
    onBeforePaste?: (body: IDocumentBody) => IDocumentBody;
}

export interface IDocClipboardService {
    copy(sliceType?: SliceBodyType): Promise<boolean>;
    cut(): Promise<boolean>;
    paste(items: ClipboardItem[]): Promise<boolean>;
    legacyPaste(html?: string, text?: string): Promise<boolean>;
    addClipboardHook(hook: IDocClipboardHook): IDisposable;
}

function getTableSlice(body: IDocumentBody, start: number, end: number): IDocumentBody {
    const bodySlice = getBodySlice(body, start, end + 2); // +2 for '\r\n in last cell'

    const dataStream = DataStreamTreeTokenType.TABLE_START +
        DataStreamTreeTokenType.TABLE_ROW_START +
        DataStreamTreeTokenType.TABLE_CELL_START +
        bodySlice.dataStream +
        DataStreamTreeTokenType.TABLE_CELL_END +
        DataStreamTreeTokenType.TABLE_ROW_END +
        DataStreamTreeTokenType.TABLE_END;

    bodySlice.dataStream = dataStream;
    bodySlice.textRuns?.forEach((textRun) => {
        const { st, ed } = textRun;
        textRun.st = st + 3;
        textRun.ed = ed + 3;
    });

    bodySlice.tables?.forEach((table) => {
        const { startIndex, endIndex } = table;
        table.startIndex = startIndex + 3;
        table.endIndex = endIndex + 3;
    });

    bodySlice.paragraphs?.forEach((paragraph) => {
        const { startIndex } = paragraph;
        paragraph.startIndex = startIndex + 3;
    });

    return bodySlice;
}

export const IDocClipboardService = createIdentifier<IDocClipboardService>('doc.clipboard-service');

export class DocClipboardService extends Disposable implements IDocClipboardService {
    private _clipboardHooks: IDocClipboardHook[] = [];

    private _htmlToUDM = new HtmlToUDMService();
    private _umdToHtml = new UDMToHtmlService();

    constructor(
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @ILogService private readonly _logService: ILogService,
        @ICommandService private readonly _commandService: ICommandService,
        @IClipboardInterfaceService private readonly _clipboardInterfaceService: IClipboardInterfaceService,
        @Inject(DocSelectionManagerService) private readonly _docSelectionManagerService: DocSelectionManagerService
    ) {
        super();
    }

    async copy(sliceType: SliceBodyType = SliceBodyType.copy): Promise<boolean> {
        const { bodyList = [], needCache = false, snapshot } = this._getDocumentBodyInRanges(sliceType) ?? {};

        if (bodyList.length === 0 || snapshot == null) {
            return false;
        }

        try {
            const activeRange = this._docSelectionManagerService.getActiveTextRange();
            const isCopyInHeaderFooter = !!activeRange?.segmentId;

            this._setClipboardData(bodyList, snapshot, !isCopyInHeaderFooter && needCache);
        } catch (e) {
            this._logService.error('[DocClipboardService] copy failed', e);
            return false;
        }

        return true;
    }

    async cut(): Promise<boolean> {
        return this._cut();
    }

    async paste(items: ClipboardItem[]): Promise<boolean> {
        const partDocData = await this._genDocDataFromClipboardItems(items);

        return this._paste(partDocData);
    }

    async legacyPaste(html?: string, text?: string): Promise<boolean> {
        const partDocData = this._genDocDataFromHtmlAndText(html, text);

        // Paste in sheet editing mode without paste style, so we give textRuns empty array;
        if (this._univerInstanceService.getCurrentUnitForType(UniverInstanceType.UNIVER_DOC)?.getUnitId() === DOCS_NORMAL_EDITOR_UNIT_ID_KEY) {
            if (text) {
                const textDocData = this._generateBody(text);
                return this._paste({ body: textDocData });
            } else {
                partDocData.body!.textRuns = [];
            }
        }

        return this._paste(partDocData);
    }

    private async _cut(): Promise<boolean> {
        const {
            segmentId,
            endOffset: activeEndOffset,
            style,
        } = this._docSelectionManagerService.getActiveTextRange() ?? {};
        const textRanges = this._docSelectionManagerService.getCurrentTextRanges() ?? [];
        const rectRanges = this._docSelectionManagerService.getCurrentRectRanges() ?? [];

        if (segmentId == null) {
            this._logService.error('[DocClipboardController] segmentId is not existed');
        }

        if (textRanges.length === 0 && rectRanges.length === 0) {
            return false;
        }

        // Set content to clipboard.
        this.copy(SliceBodyType.cut);

        try {
            let cursor = 0;

            if (rectRanges.length > 0) {
                cursor = getCursorWhenDelete(textRanges as Readonly<ITextRangeWithStyle[]>, rectRanges);
            } else if (activeEndOffset != null) {
                cursor = activeEndOffset;
                for (const range of textRanges) {
                    const { startOffset, endOffset } = range;

                    if (startOffset == null || endOffset == null) {
                        continue;
                    }

                    if (endOffset <= activeEndOffset) {
                        cursor -= endOffset - startOffset;
                    }
                }
            }

            const newTextRanges = [
                {
                    startOffset: cursor,
                    endOffset: cursor,
                    style,
                },
            ];

            return this._commandService.executeCommand(CutContentCommand.id, { segmentId, textRanges: newTextRanges });
            // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (_e) {
            this._logService.error('[DocClipboardController] cut content failed');
            return false;
        }
    }

    private async _paste(docData: Partial<IDocumentData>): Promise<boolean> {
        const { body: _body } = docData;

        if (_body == null) {
            return false;
        }

        let body = normalizeBody(_body);

        const unitId = this._univerInstanceService.getCurrentUnitForType(UniverInstanceType.UNIVER_DOC)?.getUnitId();
        if (!unitId) {
            return false;
        }

        this._clipboardHooks.forEach((hook) => {
            if (hook.onBeforePaste) {
                body = hook.onBeforePaste(body);
            }
        });

        // copy custom ranges
        body.customRanges = body.customRanges?.map(copyCustomRange);

        const activeRange = this._docSelectionManagerService.getActiveTextRange();
        const { segmentId, endOffset: activeEndOffset, style } = activeRange || {};
        const ranges = this._docSelectionManagerService.getCurrentTextRanges();

        if (segmentId == null) {
            this._logService.error('[DocClipboardController] segmentId does not exist!');
        }

        if (activeEndOffset == null || ranges == null) {
            return false;
        }

        try {
            // When doc has multiple selections, the cursor moves to the last pasted content's end.
            let cursor = activeEndOffset;
            for (const range of ranges) {
                const { startOffset, endOffset } = range;

                if (startOffset == null || endOffset == null) {
                    continue;
                }

                if (endOffset <= activeEndOffset) {
                    cursor += body.dataStream.length - (endOffset - startOffset);
                }
            }

            const textRanges = [
                {
                    startOffset: cursor,
                    endOffset: cursor,
                    style,
                },
            ];

            return this._commandService.executeCommand(InnerPasteCommand.id, {
                doc: {
                    ...docData,
                    body,
                },
                segmentId,
                textRanges,
            });
        } catch (_) {
            this._logService.error('[DocClipboardController]', 'clipboard is empty.');
            return false;
        }
    }

    private async _setClipboardData(documentBodyList: IDocumentBody[], snapshot: IDocumentData, needCache = true): Promise<void> {
        const copyId = genId();
        const text =
            documentBodyList.length > 1
                ? documentBodyList.map((body) => body.dataStream).join('\n')
                : documentBodyList[0].dataStream;
        let html = this._umdToHtml.convert(documentBodyList);

        // Only cache copy content when the range is 1.
        if (documentBodyList.length === 1 && needCache) {
            html = html.replace(/(<[a-z]+)/, (_p0, p1) => `${p1} data-copy-id="${copyId}"`);
            const body = documentBodyList[0];
            const cache: Partial<IDocumentData> = { body };

            if (body.customBlocks?.length) {
                cache.drawings = {};

                for (const block of body.customBlocks) {
                    const { blockId } = block;
                    const drawing = snapshot.drawings?.[blockId];

                    if (drawing) {
                        const id = Tools.generateRandomId(6);

                        block.blockId = id;

                        cache.drawings[id] = {
                            ...Tools.deepClone(drawing),
                            drawingId: id,
                        };
                    }
                }
            }

            copyContentCache.set(copyId, cache);
        }

        return this._clipboardInterfaceService.write(text, html);
    }

    addClipboardHook(hook: IDocClipboardHook): IDisposable {
        this._clipboardHooks.push(hook);

        return toDisposable(() => {
            const index = this._clipboardHooks.indexOf(hook);

            if (index > -1) {
                this._clipboardHooks.splice(index, 1);
            }
        });
    }

    private _getDocumentBodyInRanges(sliceType: SliceBodyType): Nullable<{
        bodyList: IDocumentBody[];
        needCache: boolean;
        snapshot: IDocumentData;
    }> {
        const docDataModel = this._univerInstanceService.getCurrentUniverDocInstance();
        const allRanges = this._docSelectionManagerService.getDocRanges();

        const results: IDocumentBody[] = [];
        let needCache = true;

        if (docDataModel == null || allRanges.length === 0) {
            return;
        }

        const segmentId = allRanges[0].segmentId;

        const body = docDataModel?.getSelfOrHeaderFooterModel(segmentId)?.getBody();

        const snapshot = docDataModel.getSnapshot();

        if (body == null) {
            return;
        }

        for (const range of allRanges) {
            const { startOffset, endOffset, collapsed, rangeType } = range;

            if (collapsed || startOffset == null || endOffset == null) {
                continue;
            }

            if (rangeType === DOC_RANGE_TYPE.RECT) {
                needCache = false;

                const { spanEntireRow } = range as IRectRangeWithStyle;
                let bodySlice: IDocumentBody;
                if (!spanEntireRow) {
                    bodySlice = getTableSlice(body, startOffset, endOffset);
                } else {
                    bodySlice = getTableSlice(body, startOffset, endOffset);
                }

                results.push(bodySlice);

                continue;
            }

            const deleteRange = getDeleteSelection({ startOffset, endOffset, collapsed }, body);

            const docBody = docDataModel.getSelfOrHeaderFooterModel(segmentId).sliceBody(deleteRange.startOffset, deleteRange.endOffset, sliceType);
            if (docBody == null) {
                continue;
            }

            results.push(docBody);
        }

        return {
            bodyList: results,
            needCache,
            snapshot,
        };
    }

    private async _genDocDataFromClipboardItems(items: ClipboardItem[]): Promise<Partial<IDocumentData>> {
        try {
            // TODO: support paste image.

            let html = '';
            let text = '';

            for (const clipboardItem of items) {
                for (const type of clipboardItem.types) {
                    if (type === PLAIN_TEXT_CLIPBOARD_MIME_TYPE) {
                        text = await clipboardItem.getType(type).then((blob) => blob && blob.text());
                    } else if (type === HTML_CLIPBOARD_MIME_TYPE) {
                        html = await clipboardItem.getType(type).then((blob) => blob && blob.text());
                    }
                }
            }

            return this._genDocDataFromHtmlAndText(html, text);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    private _generateBody(text: string): IDocumentBody {
        // Convert all \n to \r, because we use \r to indicate paragraph break.
        const dataStream = text.replace(/\n/g, '\r');

        if (!text.includes('\r') && Tools.isLegalUrl(text)) {
            const id = generateRandomId();
            const urlText = `${DataStreamTreeTokenType.CUSTOM_RANGE_START}${dataStream}${DataStreamTreeTokenType.CUSTOM_RANGE_END}`;
            const range: ICustomRange = {
                startIndex: 0,
                endIndex: urlText.length - 1,
                rangeId: id,
                rangeType: CustomRangeType.HYPERLINK,
                properties: {
                    url: text,
                },
            };

            return {
                dataStream: urlText,
                customRanges: [range],
            };
        }

        const paragraphs: IParagraph[] = [];

        for (let i = 0; i < dataStream.length; i++) {
            if (dataStream[i] === '\r') {
                paragraphs.push({ startIndex: i });
            }
        }

        return {
            dataStream,
            paragraphs,
        };
    }

    private _genDocDataFromHtmlAndText(html?: string, text?: string): Partial<IDocumentData> {
        if (!html) {
            if (text) {
                const body = this._generateBody(text);

                return { body };
            } else {
                throw new Error('[DocClipboardService] html and text cannot be both empty!');
            }
        }

        const copyId = extractId(html);
        if (copyId) {
            const copyCache = copyContentCache.get(copyId);
            if (copyCache) {
                return copyCache;
            }
        }

        const doc = this._htmlToUDM.convert(html);

        return doc;
    }
}
