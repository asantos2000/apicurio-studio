/**
 * @license
 * Copyright 2017 JBoss Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, ViewChildren, QueryList} from "@angular/core";
import {ModalDirective} from "ngx-bootstrap";


@Component({
    moduleId: module.id,
    selector: "editor-disconnected-dialog",
    templateUrl: "editor-disconnected.component.html"
})
export class EditorDisconnectedDialogComponent {

    @ViewChildren("editorDisconnectedModal") editorDisconnectedModal: QueryList<ModalDirective>;

    protected _isOpen: boolean = false;

    /**
     * Called to open the dialog.
     */
    public open(): void {
        this._isOpen = true;
        this.editorDisconnectedModal.changes.subscribe( thing => {
            if (this.editorDisconnectedModal.first) {
                this.editorDisconnectedModal.first.show();
            }
        });
    }

    /**
     * Called to close the dialog.
     */
    public close(): void {
        this._isOpen = false;
    }

    /**
     * Called when the user clicks "Reload Page".
     */
    protected reload(): void {
        window.location.reload();
    }

    /**
     * Returns true if the dialog is open.
     * 
     */
    public isOpen(): boolean {
        return this._isOpen;
    }

}
