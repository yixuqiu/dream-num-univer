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

import type { Nullable, Workbook, Worksheet } from '@univerjs/core';
import { IUniverInstanceService, UniverInstanceType } from '@univerjs/core';
import { useDependency } from '@wendellhu/redi/react-bindings';

import { useObservable } from '../../components/hooks/observable';

/**
 * A react hooks to get the active workbook.
 */
export function useActiveWorkbook(): Nullable<Workbook> {
    const univerInstanceService = useDependency(IUniverInstanceService);
    const activeWorkbook = useObservable(univerInstanceService.getCurrentTypeOfUnit$<Workbook>(UniverInstanceType.UNIVER_SHEET));
    return activeWorkbook;
}

/**
 * A react hooks to get the active worksheet.
 */
export function useActiveWorksheet(): Nullable<Worksheet> {
    const activeWorkbook = useActiveWorkbook();
    const activeWorksheet = useObservable(activeWorkbook?.activeSheet$, null);
    return activeWorksheet;
}
