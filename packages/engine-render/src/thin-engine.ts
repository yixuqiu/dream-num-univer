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

import { Disposable, Observable } from '@univerjs/core';
import type { IDisposable } from '@wendellhu/redi';

import type { CURSOR_TYPE } from './basics/const';
import { RENDER_CLASS_TYPE } from './basics/const';
import type { IEvent } from './basics/i-events';
import type { ITransformChangeState } from './basics/interfaces';
import type { Canvas } from './canvas';

// FIXME: T should extends something that is disposable
export abstract class ThinEngine<T extends IDisposable> extends Disposable {
    onInputChangedObservable = new Observable<IEvent>();

    onTransformChangeObservable = new Observable<ITransformChangeState>();

    private _scenes: { [sceneKey: string]: T } = {};

    private _activeScene: T | null = null;

    get classType() {
        return RENDER_CLASS_TYPE.ENGINE;
    }

    get activeScene() {
        return this._activeScene;
    }

    get width() {
        return 0;
    }

    get height() {
        return 0;
    }

    getScenes() {
        return this._scenes;
    }

    getScene(sceneKey: string): T | null {
        return this._scenes[sceneKey];
    }

    hasScene(sceneKey: string): boolean {
        return sceneKey in this._scenes;
    }

    addScene(sceneInstance: T): T {
        const sceneKey = (sceneInstance as any).sceneKey;
        if (this.hasScene(sceneKey)) {
            console.warn('Scenes has similar key, it will be covered');
        }
        // const newScene = new Scene(this);
        this._scenes[sceneKey] = sceneInstance;
        return sceneInstance;
    }

    setActiveScene(sceneKey: string): T | null {
        const scene = this.getScene(sceneKey);
        if (scene) {
            this._activeScene = scene;
        }
        return scene;
    }

    setRemainCapture() {}

    hasActiveScene(): boolean {
        return this._activeScene != null;
    }

    override dispose() {
        super.dispose();

        const scenes = { ...this.getScenes() };
        const sceneKeys = Object.keys(scenes);
        sceneKeys.forEach((key) => {
            (scenes[key] as any).dispose();
        });
        this._scenes = {};
    }

    remainScene(key: string) {
        const scenes = this.getScenes();
        if (scenes[key]) {
            const scene = scenes[key];
            delete scenes[key];
            return scene;
        }
    }

    abstract clearCanvas(): void;

    abstract getCanvas(): Canvas;

    abstract getCanvasElement(): HTMLCanvasElement;

    abstract setCanvasCursor(val: CURSOR_TYPE): void;

    abstract getPixelRatio(): number;
}
