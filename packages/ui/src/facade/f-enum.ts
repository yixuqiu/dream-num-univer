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

import { FEnum } from '@univerjs/core/facade';
import { BuiltInUIPart } from '@univerjs/ui';

/**
 * @ignore
 */
interface IFUIEnumMixin {
    get BuiltInUIPart(): typeof BuiltInUIPart;
}

/**
 * @ignore
 */
export class FUIEnum extends FEnum implements IFUIEnumMixin {
    override get BuiltInUIPart(): typeof BuiltInUIPart {
        return BuiltInUIPart;
    };
}

FEnum.extend(FUIEnum);

declare module '@univerjs/core/facade' {
    // eslint-disable-next-line ts/naming-convention
    interface FEnum extends IFUIEnumMixin {}
}
