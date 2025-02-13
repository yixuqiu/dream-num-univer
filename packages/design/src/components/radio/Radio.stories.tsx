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

import type { Meta } from '@storybook/react';
import React from 'react';

import { Radio } from './Radio';

const meta: Meta<typeof Radio> = {
    title: 'Components / Radio',
    component: Radio,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;

export const RadioBasic = {
    render() {
        return <Radio>radio 1</Radio>;
    },
};

export const RadioDisabled = {
    render() {
        return (
            <>
                <Radio disabled>radio 1</Radio>
                <Radio disabled checked>
                    radio 2
                </Radio>
            </>
        );
    },
};
