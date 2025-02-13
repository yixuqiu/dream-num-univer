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

import type zhCN from './zh-CN';

const locale: typeof zhCN = {
    docImage: {
        title: '圖片',

        upload: {
            float: '插入圖片',
        },

        panel: {
            title: '編圖',
        },
    },
    'image-popup': {
        replace: '替換',
        delete: '刪除',
        edit: '編輯',
        crop: '裁切',
        reset: '重置大小',
    },
    'image-text-wrap': {
        title: '文字环绕',
        wrappingStyle: '环绕方式',
        square: '四周型',
        topAndBottom: '上下型',
        inline: '嵌入型',
        behindText: '衬于文字下方',
        inFrontText: '浮于文字上方',
        wrapText: '自动换行',
        bothSide: '两侧',
        leftOnly: '左侧',
        rightOnly: '右侧',
        distanceFromText: '距正文',
        top: '上（px）',
        left: '左（px）',
        bottom: '下（px）',
        right: '右（px）',
    },
    'image-position': {
        title: '位置',
        horizontal: '水平',
        vertical: '垂直',
        absolutePosition: '绝对位置（px）',
        relativePosition: '相对位置',
        toTheRightOf: '右侧',
        relativeTo: '相对于',
        bellow: '下方',
        options: '选项',
        moveObjectWithText: '对象随文字移动',
        column: '栏',
        margin: '页边距',
        page: '页面',
        line: '行',
        paragraph: '段落',
    },
    'update-status': {
        exceedMaxSize: '圖片大小超過限制, 限制為{0}M',
        invalidImageType: '圖片類型錯誤',
        exceedMaxCount: '圖片只能一次上傳{0}張',
        invalidImage: '無效圖片',
    },
};

export default locale;
