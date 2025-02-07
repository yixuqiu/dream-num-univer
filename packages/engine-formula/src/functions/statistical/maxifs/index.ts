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

import { ErrorType } from '../../../basics/error-type';
import { expandArrayValueObject } from '../../../engine/utils/array-object';
import { booleanObjectIntersection, valueObjectCompare } from '../../../engine/utils/object-compare';
import { ArrayValueObject } from '../../../engine/value-object/array-value-object';
import type { BaseValueObject, IArrayValueObject } from '../../../engine/value-object/base-value-object';
import { ErrorValueObject } from '../../../engine/value-object/base-value-object';
import { BaseFunction } from '../../base-function';

export class Maxifs extends BaseFunction {
    override calculate(maxRange: BaseValueObject, ...variants: BaseValueObject[]) {
        if (maxRange === null) {
            return ErrorValueObject.create(ErrorType.NA);
        }

        if (variants.length < 2) {
            return ErrorValueObject.create(ErrorType.NA);
        }

        if (maxRange.isError()) {
            return ErrorValueObject.create(ErrorType.NA);
        }

        if (!maxRange.isArray()) {
            return ErrorValueObject.create(ErrorType.VALUE);
        }

        // Range and criteria must be paired
        if (variants.length % 2 !== 0) {
            return ErrorValueObject.create(ErrorType.VALUE);
        }

        // Every range must be array
        if (variants.some((variant, i) => i % 2 === 0 && !variant.isArray())) {
            return ErrorValueObject.create(ErrorType.VALUE);
        }

        const sumRowLength = (maxRange as ArrayValueObject).getRowCount();
        const sumColumnLength = (maxRange as ArrayValueObject).getColumnCount();
        // The size of the extended range is determined by the maximum width and height of the criteria range.
        let maxRowLength = 0;
        let maxColumnLength = 0;

        variants.forEach((variant, i) => {
            if (i % 2 === 1) {
                if (variant.isArray()) {
                    const arrayValue = variant as ArrayValueObject;
                    maxRowLength = Math.max(maxRowLength, arrayValue.getRowCount());
                    maxColumnLength = Math.max(maxColumnLength, arrayValue.getColumnCount());
                } else {
                    maxRowLength = Math.max(maxRowLength, 1);
                    maxColumnLength = Math.max(maxColumnLength, 1);
                }
            }
        });

        const booleanResults: BaseValueObject[][] = [];

        for (let i = 0; i < variants.length; i++) {
            if (i % 2 === 1) continue;

            const range = variants[i] as ArrayValueObject;

            const rangeRowLength = range.getRowCount();
            const rangeColumnLength = range.getColumnCount();
            if (rangeRowLength !== sumRowLength || rangeColumnLength !== sumColumnLength) {
                return expandArrayValueObject(maxRowLength, maxColumnLength, ErrorValueObject.create(ErrorType.NA));
            }

            const criteria = variants[i + 1];
            const criteriaArray = expandArrayValueObject(maxRowLength, maxColumnLength, criteria, ErrorValueObject.create(ErrorType.NA));

            criteriaArray.iterator((criteriaValueObject, rowIndex, columnIndex) => {
                if (!criteriaValueObject) {
                    return;
                }

                const resultArrayObject = valueObjectCompare(range, criteriaValueObject);

                if (booleanResults[rowIndex] === undefined) {
                    booleanResults[rowIndex] = [];
                }

                if (booleanResults[rowIndex][columnIndex] === undefined) {
                    booleanResults[rowIndex][columnIndex] = resultArrayObject;
                }

                booleanResults[rowIndex][columnIndex] = booleanObjectIntersection(booleanResults[rowIndex][columnIndex], resultArrayObject);
            });
        }

        const maxResults = booleanResults.map((row) => {
            return row.map((booleanResult) => {
                const picked = (maxRange as ArrayValueObject).pick(booleanResult as ArrayValueObject);
                if (picked.getColumnCount() === 0) {
                    return ArrayValueObject.create('0');
                }

                return picked.max();
            });
        });

        const arrayValueObjectData: IArrayValueObject = {
            calculateValueList: maxResults,
            rowCount: maxResults.length,
            columnCount: maxResults[0].length,
            unitId: this.unitId || '',
            sheetId: this.subUnitId || '',
            row: this.row,
            column: this.column,
        };

        return ArrayValueObject.create(arrayValueObjectData);
    }
}
