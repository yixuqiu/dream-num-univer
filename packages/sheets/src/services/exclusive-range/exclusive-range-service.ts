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

import type { IRange } from '@univerjs/core';
import { createIdentifier, Disposable, Rectangle } from '@univerjs/core';
import type { ISelectionWithStyle } from '../../basics/selection';

interface IFeatureRange {
    groupId: string;
    range: IRange;
}

export interface IExclusiveRangeService {
    /**
     * @description Add an exclusive range to the service
     * @param {string} unitId The unitId of the exclusive range
     * @param {string} sheetId The sheetId of the exclusive range
     * @param {string} feature The feature of the exclusive range
     * @param {IFeatureRange} range The exclusive range
     */
    addExclusiveRange(unitId: string, sheetId: string, feature: string, ranges: IFeatureRange[]): void;
    /**
     * @description Get the exclusive ranges
     * @param {string} unitId The unitId of the exclusive range
     * @param {string} sheetId The sheetId of the exclusive range
     * @param {string} feature The feature of the exclusive range
     * @returns {undefined | IFeatureRange[]} The exclusive ranges
     */
    getExclusiveRanges(unitId: string, sheetId: string, feature: string): undefined | IFeatureRange[];
    /**
     * @description Clear the exclusive ranges
     * @param {string} unitId The unitId of the exclusive range
     * @param {string} sheetId The sheetId of the exclusive range
     * @param {string} feature The feature of the exclusive range
     */
    clearExclusiveRanges(unitId: string, sheetId: string, feature: string): void;

    /**
     * @description Clear the exclusive ranges by groupId
     * @param {string} unitId  The unitId of the exclusive range
     * @param {string} sheetId The sheetId of the exclusive range
     * @param {string} feature The feature of the exclusive range
     * @param {string} groupId The groupId of the exclusive range
     */
    clearExclusiveRangesByGroupId(unitId: string, sheetId: string, feature: string, groupId: string): void;
    /**
     * Check the interest group id of the giving selection
     * @param {ISelectionWithStyle[]} selections The selections to check
     */
    getInterestGroupId(selections: ISelectionWithStyle[]): string[];
}
export const IExclusiveRangeService = createIdentifier<IExclusiveRangeService>('univer.exclusive-range-service');

export class ExclusiveRangeService extends Disposable implements IExclusiveRangeService {
    /**
     * Exclusive range data structure is as follows: unitId -> sheetId -> feature -> range
     */
    private _exclusiveRanges: Map<string, Map<string, Map<string, IFeatureRange[]>>> = new Map();

    private _ensureUnitMap(unitId: string) {
        if (!this._exclusiveRanges.has(unitId)) {
            this._exclusiveRanges.set(unitId, new Map());
        }
        return this._exclusiveRanges.get(unitId)!;
    }

    private _ensureSubunitMap(unitId: string, sheetId: string) {
        const unitMap = this._ensureUnitMap(unitId);
        if (!unitMap.has(sheetId)) {
            unitMap.set(sheetId, new Map());
        }
        return unitMap.get(sheetId)!;
    }

    private _ensureFeature(unitId: string, sheetId: string, feature: string) {
        const subunitMap = this._ensureSubunitMap(unitId, sheetId);
        if (!subunitMap.has(feature)) {
            subunitMap.set(feature, []);
        }
        return subunitMap.get(feature)!;
    }

    public addExclusiveRange(unitId: string, sheetId: string, feature: string, ranges: IFeatureRange[]) {
        const featureMap = this._ensureFeature(unitId, sheetId, feature);
        featureMap.push(...ranges);
    }

    public getExclusiveRanges(unitId: string, sheetId: string, feature: string): undefined | IFeatureRange[] {
        return this._exclusiveRanges.get(unitId)?.get(sheetId)?.get(feature);
    }

    public clearExclusiveRanges(unitId: string, sheetId: string, feature: string) {
        this._ensureFeature(unitId, sheetId, feature);
        this._exclusiveRanges.get(unitId)!.get(sheetId)!.set(feature, []);
    }

    public clearExclusiveRangesByGroupId(unitId: string, sheetId: string, feature: string, groupId: string) {
        const featureMap = this.getExclusiveRanges(unitId, sheetId, feature);
        if (featureMap) {
            const newFeatureMap = featureMap.filter((item) => item.groupId !== groupId);
            this._exclusiveRanges.get(unitId)!.get(sheetId)!.set(feature, newFeatureMap);
        }
    }

    public getInterestGroupId(selections: ISelectionWithStyle[]): string[] {
        const interestGroupId: string[] = [];
        for (const unitId of this._exclusiveRanges.keys()) {
            for (const sheetId of this._exclusiveRanges.get(unitId)!.keys()) {
                for (const feature of this._exclusiveRanges.get(unitId)!.get(sheetId)!.keys()) {
                    const featureMapRanges = this.getExclusiveRanges(unitId, sheetId, feature);
                    if (featureMapRanges) {
                        for (const featureMapRange of featureMapRanges) {
                            let isIntersect = false;
                            for (const selection of selections) {
                                if (Rectangle.intersects(selection.range, featureMapRange.range)) {
                                    interestGroupId.push(feature);
                                    isIntersect = true;
                                    break;
                                }
                            }
                            if (isIntersect) {
                                break;
                            }
                        }
                    }
                }
            }
        }
        return interestGroupId;
    }
}
