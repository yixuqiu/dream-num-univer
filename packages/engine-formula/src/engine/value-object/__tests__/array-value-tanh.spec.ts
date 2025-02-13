/**
 * Copyright 2023-present DreamNum Co., Ltd.
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

import { describe, expect, it } from 'vitest';

import { ArrayValueObject, transformToValueObject } from '../array-value-object';

describe('arrayValueObject tanh method test', () => {
    describe('tanh', () => {
        it('origin nm, param nm', () => {
            const atanArrayValueObject = ArrayValueObject.create({
                calculateValueList: transformToValueObject([
                    [8, 1, ' ', 1.23, true, false],
                    [27, 0, '100', '2.34', 'test', -3],
                ]),
                rowCount: 2,
                columnCount: 6,
                unitId: '',
                sheetId: '',
                row: 0,
                column: 0,
            });

            expect((atanArrayValueObject.tanh() as ArrayValueObject).toValue()).toStrictEqual([
                [0.9999997749296758, 0.7615941559557649, '#VALUE!', 0.8425793256589296, 0.7615941559557649, 0],
                [1, 0, 1, 0.9816125892654238, '#VALUE!', -0.9950547536867305],
            ]);
        });
    });
});
