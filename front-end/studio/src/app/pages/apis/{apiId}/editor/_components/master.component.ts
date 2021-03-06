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

import {Component, HostListener, Input, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {
    Oas20Document,
    Oas20ResponseDefinition,
    Oas20SchemaDefinition,
    Oas30Document,
    Oas30ResponseDefinition,
    Oas30SchemaDefinition,
    OasAllNodeVisitor,
    OasDocument,
    OasLibraryUtils,
    OasNode,
    OasNodePath,
    OasOperation,
    OasPathItem,
    OasVisitorUtil
} from "oai-ts-core";
import {AddPathDialogComponent} from "./dialogs/add-path.component";
import {ClonePathDialogComponent} from "./dialogs/clone-path.component";
import {CloneDefinitionDialogComponent} from "./dialogs/clone-definition.component";
import {FindPathItemsVisitor} from "../_visitors/path-items.visitor";
import {FindSchemaDefinitionsVisitor} from "../_visitors/schema-definitions.visitor";
import {ObjectUtils} from "../_util/object.util";
import {
    createAddPathItemCommand,
    createAddSchemaDefinitionCommand,
    createDeleteOperationCommand,
    createDeletePathCommand,
    createDeleteSchemaDefinitionCommand,
    createNewPathCommand,
    createNewSchemaDefinitionCommand,
    createRenameSchemaDefinitionCommand,
    ICommand
} from "oai-ts-commands";
import {ModelUtils} from "../_util/model.util";
import {ApiEditorUser} from "../../../../../models/editor-user.model";
import {RenameDefinitionDialogComponent} from "./dialogs/rename-definition.component";
import {SelectionService} from "../_services/selection.service";
import {Subscription} from "rxjs/Subscription";
import {CommandService} from "../_services/command.service";


/**
 * The component that models the master view of the API editor.  This is the
 * left-hand side of the editor, which lists things like Paths and Definitions.
 * Users will select an item in this master panel which will result in a form
 * being displayed in the detail panel.
 */
@Component({
    moduleId: module.id,
    selector: "master",
    templateUrl: "master.component.html"
})
export class EditorMasterComponent implements OnInit, OnDestroy {

    @Input() document: OasDocument;

    private _library: OasLibraryUtils = new OasLibraryUtils();

    selectionSubscription: Subscription;

    contextMenuSelection: OasNodePath = null;
    contextMenuType: string = null;
    contextMenuPos: any = {
        left: "0px",
        top: "0px"
    };

    @ViewChild("addPathDialog") addPathDialog: AddPathDialogComponent;
    @ViewChild("clonePathDialog") clonePathDialog: ClonePathDialogComponent;
    @ViewChild("cloneDefinitionDialog") cloneDefinitionDialog: CloneDefinitionDialogComponent;
    @ViewChild("renameDefinitionDialog") renameDefinitionDialog: RenameDefinitionDialogComponent;

    filterCriteria: string = null;

    constructor(private selectionService: SelectionService, private commandService: CommandService) {
    }

    public ngOnInit(): void {
        this.selectionSubscription = this.selectionService.selection().subscribe( () => {});
        this.selectionService.selectRoot(this.document);
    }

    public ngOnDestroy(): void {
        this.selectionSubscription.unsubscribe();
    }

    public isOAI30(): boolean {
        return this.document.is3xDocument();
    }

    public isSwagger2(): boolean {
        return this.document.is2xDocument();
    }

    /**
     * Returns an array of paths that match the filter criteria and are sorted alphabetically.
     * @return
     */
    public paths(): OasPathItem[] {
        let viz: FindPathItemsVisitor = new FindPathItemsVisitor(this.filterCriteria);
        OasVisitorUtil.visitTree(this.document, viz);
        return viz.getSortedPathItems();
    }

    /**
     * Returns the array of definitions, filtered by search criteria and sorted.
     * @return
     */
    public definitions(): (Oas20SchemaDefinition | Oas30SchemaDefinition)[] {
        let viz: FindSchemaDefinitionsVisitor = new FindSchemaDefinitionsVisitor(this.filterCriteria);
        OasVisitorUtil.visitTree(this.document, viz);
        return viz.getSortedSchemaDefinitions();
    }

    /**
     * Returns an array of responses filtered by the search criteria and sorted.
     * @return
     */
    public responses(): (Oas20ResponseDefinition | Oas30ResponseDefinition)[] {
        return [];
        // if (this.document.responses) {
        //     return this.document.responses.responses().filter( response => {
        //         if (this.acceptThroughFilter(response.name())) {
        //             return response;
        //         } else {
        //             return null;
        //         }
        //     }).sort( (response1, response2) => {
        //         return response1.name().localeCompare(response2.name());
        //     });
        // } else {
        //     return [];
        // }
    }

    /**
     * Returns true if the given item is a valid path in the current document.
     * @param pathItem
     * @return
     */
    protected isValidPathItem(pathItem: OasPathItem): boolean {
        if (ObjectUtils.isNullOrUndefined(pathItem)) {
            return false;
        }
        if (ObjectUtils.isNullOrUndefined(this.document.paths)) {
            return false;
        }
        let pi: any = this.document.paths.pathItem(pathItem.path());
        return pi === pathItem;
    }

    /**
     * Returns true if the given operation is a valid operation contained within the
     * current document.
     * @param operation
     * @return
     */
    protected isValidOperation(operation: OasOperation): boolean {
        let pathItem: OasPathItem = operation.parent() as OasPathItem;

        if (ObjectUtils.isNullOrUndefined(operation)) {
            return false;
        }

        if (!this.isValidPathItem(pathItem)) {
            return false;
        }

        let pi: any = this.document.paths.pathItem(pathItem.path());
        let op: any = pi[operation.method()];

        return op === operation;
    }

    /**
     * Returns true if the given schema definition is valid and contained within the
     * current document.
     * @param definition
     * @return
     */
    protected isValidDefinition(definition: Oas20SchemaDefinition | Oas30SchemaDefinition): boolean {
        if (ObjectUtils.isNullOrUndefined(definition)) {
            return false;
        }
        return this.definitions().indexOf(definition) !== -1;
    }

    /**
     * Returns true if the given response is valid and contained within the
     * current document.
     * @param response
     * @return
     */
    protected isValidResponse(response: Oas20ResponseDefinition | Oas30ResponseDefinition): boolean {
        if (ObjectUtils.isNullOrUndefined(response)) {
            return false;
        }
        return this.responses().indexOf(response) !== -1;
    }

    /**
     * Called when the user selects the main/default element from the master area.
     */
    public selectMain(): void {
        this.selectionService.selectRoot(this.document);
    }

    /**
     * Called when the user selects a path from the master area.
     * @param path
     */
    public selectPath(path: OasPathItem): void {
        this.selectionService.selectNode(path, this.document);
    }

    /**
     * Called to deselect the currently selected path.
     */
    public deselectPath(): void {
        this.selectMain();
    }

    /**
     * Called when the user clicks an operation.
     * @param operation
     */
    public selectOperation(operation: OasOperation): void {
        if (this.isSelected(operation)) {
            this.selectionService.selectNode(operation.parent(), this.document);
        } else {
            this.selectionService.selectNode(operation, this.document);
        }
    }

    /**
     * Called to deselect the currently selected operation.
     */
    public deselectOperation(): void {
        let node: OasNode = this.selectionService.currentSelection().resolve(this.document);
        if (node) {
            this.selectionService.selectNode(node.parent(), this.document);
        }
    }

    /**
     * Called when the user selects a definition from the master area.
     * @param def
     */
    public selectDefinition(def: Oas20SchemaDefinition | Oas30SchemaDefinition): void {
        this.selectionService.selectNode(def, this.document);
    }

    /**
     * Deselects the currently selected definition.
     */
    public deselectDefinition(): void {
        this.selectMain();
    }

    /**
     * Called when the user selects a response from the master area.
     * @param response
     */
    public selectResponse(response: Oas20ResponseDefinition | Oas30ResponseDefinition): void {
        this.selectionService.selectNode(response, this.document);
    }

    /**
     * Deselects the currently selected response.
     */
    public deselectResponse(): void {
        this.selectMain();
    }

    /**
     * Called whenever the user presses a key.
     * @param event
     */
    public onGlobalKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape"  && !event.metaKey && !event.altKey && !event.ctrlKey) {
            this.closeContextMenu();
        }
    }

    /**
     * Called to return the currently selected path (if one is selected).  If not, returns "/".
     */
    public getCurrentPathSelection(): string {
        let node: OasNode = this.selectionService.currentSelection().resolve(this.document);
        let rval: string = "/";
        if (node && node["_path"]) {
            rval = node["_path"] + "/";
        } else if (node && node.parent() && node.parent()["_path"]) {
            rval = node.parent()["_path"] + "/";
        }
        if (rval.endsWith("//")) {
            rval = rval.substring(0, rval.length - 1);
        }
        return rval;
    }

    /**
     * Returns the selection style to use for the given (potentially selected) node.
     * @param item
     * @return
     */
    public collaboratorSelectionClasses(item: OasNode): string {
        if (item) {
            let user: ApiEditorUser = ModelUtils.isSelectedByCollaborator(item);
            if (user != null && user.attributes["id"]) {
                return user.attributes["id"];
            }
        }
        return "";
    }

    /**
     * Called when the user fills out the Add Path modal dialog and clicks Add.
     * @param path
     */
    public addPath(path: string): void {
        let command: ICommand = createNewPathCommand(this.document, path);
        this.commandService.emit(command);
        this.selectPath(this.document.paths.pathItem(path) as OasPathItem);
    }

    /**
     * Called to test whether the given resource path has an operation of the given type defined.
     * @param pathItem
     * @param operation
     * @return
     */
    public hasOperation(pathItem: OasPathItem, operation: string): boolean {
        let op: OasOperation = pathItem[operation];
        return !ObjectUtils.isNullOrUndefined(op);
    }

    /**
     * Returns true if the given node is the currently selected item *or* is the parent
     * of the currently selected item.
     * @param node
     * @return
     */
    public isSelected(node: OasNode): boolean {
        return ModelUtils.isSelected(node);
    }

    /**
     * Returns true if the main node should be selected.
     * @return
     */
    public isMainSelected(): boolean {
        return ModelUtils.isSelected(this.document);
    }

    /**
     * Returns true if the given node is the current context menu item.
     * @param node
     * @return
     */
    public isContexted(node: OasNode): boolean {
        if (this.contextMenuSelection === null) {
            return false;
        }
        return this.contextMenuSelection.contains(node);
    }

    /**
     * Returns true if the given path item has at least one operation.
     * @param pathItem
     * @return
     */
    public hasAtLeastOneOperation(pathItem: OasPathItem): boolean {
        if (pathItem) {
            if (pathItem.get) {
                return true;
            }
            if (pathItem.put) {
                return true;
            }
            if (pathItem.post) {
                return true;
            }
            if (pathItem.delete) {
                return true;
            }
            if (pathItem.options) {
                return true;
            }
            if (pathItem.head) {
                return true;
            }
            if (pathItem.patch) {
                return true;
            }
        }
        return false;
    }

    /**
     * Called when the user fills out the Add Definition modal dialog and clicks Add.
     */
    public addDefinition(modalData: any): void {
        let example: string = (modalData.example === "") ? null : modalData.example;
        let command: ICommand = createNewSchemaDefinitionCommand(this.document, modalData.name, example);
        this.commandService.emit(command);
        this.selectDefinition(this.getDefinitionByName(modalData.name));
    }

    /**
     * Gets a definition by its name.
     * @param name
     * @return
     */
    protected getDefinitionByName(name: string): Oas20SchemaDefinition | Oas30SchemaDefinition {
        if (this.document.getSpecVersion() === "2.0") {
            return (this.document as Oas20Document).definitions.definition(name);
        } else {
            return (this.document as Oas30Document).components.getSchemaDefinition(name);
        }
    }

    /**
     * Called when the user searches in the master area.
     * @param criteria
     */
    public filterAll(criteria: string): void {
        console.info("[EditorMasterComponent] Filtering master items: %s", criteria);
        this.filterCriteria = criteria;
        if (this.filterCriteria !== null) {
            this.filterCriteria = this.filterCriteria.toLowerCase();
        }
    }

    /**
     * Called when the user right-clicks on a path.
     * @param event
     * @param pathItem
     */
    public showPathContextMenu(event: MouseEvent, pathItem: OasPathItem): void {
        event.preventDefault();
        event.stopPropagation();
        this.contextMenuPos.left = event.clientX + "px";
        this.contextMenuPos.top = event.clientY + "px";
        this.contextMenuSelection = this._library.createNodePath(pathItem);
        this.contextMenuType = "path";
    }

    /**
     * Called when the user right-clicks on an operation.
     * @param event
     * @param operation
     */
    public showOperationContextMenu(event: MouseEvent, operation: OasOperation): void {
        event.preventDefault();
        event.stopPropagation();
        this.contextMenuPos.left = event.clientX + "px";
        this.contextMenuPos.top = event.clientY + "px";
        this.contextMenuSelection = this._library.createNodePath(operation);
        this.contextMenuType = "operation";
    }

    /**
     * Called when the user clicks somewhere in the document.  Used to close the context
     * menu if it is open.
     */
    @HostListener("document:click", ["$event"])
    public onDocumentClick(): void {
        this.closeContextMenu();
    }

    /**
     * Closes the context menu.
     */
    private closeContextMenu(): void {
        this.contextMenuType = null;
        this.contextMenuSelection = null;
    }

    /**
     * Called when the user clicks "New Path" in the context-menu for a path.
     */
    public newPath(): void {
        let pathItem: OasPathItem = this.contextMenuSelection.resolve(this.document) as OasPathItem;
        this.addPathDialog.open(this.document, pathItem.path());
        this.closeContextMenu();
    }

    /**
     * Called when the user clicks "Delete Path" in the context-menu for a path.
     */
    public deletePath(): void {
        let pathItem: OasPathItem = this.contextMenuSelection.resolve(this.document) as OasPathItem;
        let command: ICommand = createDeletePathCommand(this.document, pathItem.path());
        this.commandService.emit(command);
        this.closeContextMenu();
    }

    /**
     * Called when the user clicks "Clone Path" in the context-menu for a path item.
     */
    public clonePath(modalData?: any): void {
        if (undefined === modalData || modalData === null) {
            let pathItem: OasPathItem = this.contextMenuSelection.resolve(this.document) as OasPathItem;
            this.clonePathDialog.open(this.document, pathItem);
        } else {
            let pathItem: OasPathItem = modalData.object;
            console.info("[EditorMasterComponent] Clone path item: %s", modalData.path);
            let cloneSrcObj: any = this._library.writeNode(pathItem);
            let command: ICommand = createAddPathItemCommand(this.document, modalData.path, cloneSrcObj);
            this.commandService.emit(command);
        }
    }

    /**
     * Called when the user clicks "Delete Operation" in the context-menu for a operation.
     */
    public deleteOperation(): void {
        let operation: OasOperation = this.contextMenuSelection.resolve(this.document) as OasOperation;
        let command: ICommand = createDeleteOperationCommand(this.document, operation.method(), operation.parent() as OasPathItem);
        this.commandService.emit(command);
        this.closeContextMenu();
    }

    /**
     * Called when the user right-clicks on a path.
     * @param event
     * @param definition
     */
    public showDefinitionContextMenu(event: MouseEvent, definition: Oas20SchemaDefinition | Oas30SchemaDefinition): void {
        event.preventDefault();
        event.stopPropagation();
        this.contextMenuPos.left = event.clientX + "px";
        this.contextMenuPos.top = event.clientY + "px";
        this.contextMenuSelection = this._library.createNodePath(definition);
        this.contextMenuType = "definition";
    }

    /**
     * Called when the user clicks the "Delete Definition" item in the context-menu for a definition.
     */
    public deleteDefinition(): void {
        let schemaDefName: string = null;
        if (this.document.getSpecVersion() === "2.0") {
            let schemaDef: Oas20SchemaDefinition = this.contextMenuSelection.resolve(this.document) as Oas20SchemaDefinition;
            schemaDefName = schemaDef.definitionName();
        } else {
            let schemaDef: Oas30SchemaDefinition = this.contextMenuSelection.resolve(this.document) as Oas30SchemaDefinition;
            schemaDefName = schemaDef.name();
        }
        let command: ICommand = createDeleteSchemaDefinitionCommand(this.document, schemaDefName);
        this.commandService.emit(command);
        this.closeContextMenu();
    }

    /**
     * Called when the user clicks "Clone Definition" in the context-menu for a definition.
     */
    public cloneDefinition(modalData?: any): void {
        if (undefined === modalData || modalData === null) {
            let schemaDef: any = this.contextMenuSelection.resolve(this.document);
            this.cloneDefinitionDialog.open(this.document, schemaDef);
        } else {
            let definition: OasNode = modalData.definition;
            console.info("[EditorMasterComponent] Clone definition: %s", modalData.name);
            let cloneSrcObj: any = this._library.writeNode(definition);
            let command: ICommand = createAddSchemaDefinitionCommand(this.document, modalData.name, cloneSrcObj);
            this.commandService.emit(command);
        }
    }

    /**
     * Called when the user clicks "Rename Definition" in the context-menu for a schema definition.
     */
    public renameDefinition(modalData?: any): void {
        if (undefined === modalData || modalData === null) {
            let schemaDef: any = this.contextMenuSelection.resolve(this.document);
            this.renameDefinitionDialog.open(this.document, schemaDef);
        } else {
            let definition: Oas20SchemaDefinition | Oas30SchemaDefinition = modalData.definition;
            let oldName: string = definition["_definitionName"];
            if (!oldName) {
                oldName = definition["_name"];
            }
            console.info("[EditorMasterComponent] Rename definition to: %s", modalData.name);
            let command: ICommand = createRenameSchemaDefinitionCommand(this.document, oldName, modalData.name);
            this.commandService.emit(command);
        }
    }

    /**
     * Returns the name of the definition.
     * @param definition
     * @return
     */
    public definitionName(definition: Oas20SchemaDefinition | Oas30SchemaDefinition): string {
        return definition.ownerDocument().getSpecVersion() === "2.0" ?
            (definition as Oas20SchemaDefinition).definitionName() :
            (definition as Oas30SchemaDefinition).name();
    }

    /**
     * Called to determine whether there is a validation problem associated with the given
     * node (either directly on the node or any descendant node).
     * @param node
     */
    public hasValidationProblem(node: OasNode): boolean {
        let viz: HasProblemVisitor = new HasProblemVisitor();
        OasVisitorUtil.visitTree(node, viz);
        return viz.problemsFound;
    }

    /**
     * Returns the classes that should be applied to the path item in the master view.
     * @param node
     * @return
     */
    public pathClasses(node: OasPathItem): string {
        let classes: string[] = [];
        if (this.hasValidationProblem(node)) {
            classes.push("problem-marker");
        }
        if (this.isContexted(node)) {
            classes.push("contexted");
        }
        if (this.isSelected(node)) {
            classes.push("selected");
        }
        return classes.join(' ') + " " + this.collaboratorSelectionClasses(node);
    }

    /**
     * Returns the classes that should be applied to the operation in the master view.
     * @param node
     * @return
     */
    public operationClasses(node: OasOperation): string {
        let classes: string[] = [];
        if (this.hasValidationProblem(node)) {
            classes.push("problem-marker");
        }
        if (this.isContexted(node)) {
            classes.push("contexted");
        }
        if (this.isSelected(node)) {
            classes.push("selected");
        }
        return classes.join(' ') + " " + this.collaboratorSelectionClasses(node);
    }

    /**
     * Returns the classes that should be applied to the schema definition in the master view.
     * @param node
     * @return
     */
    public definitionClasses(node: OasNode): string {
        let classes: string[] = [];
        if (this.hasValidationProblem(node)) {
            classes.push("problem-marker");
        }
        if (this.isContexted(node)) {
            classes.push("contexted");
        }
        if (this.isSelected(node)) {
            classes.push("selected");
        }
        return classes.join(' ') + " " + this.collaboratorSelectionClasses(node);
    }
}


/**
 * Visitor used to search through the data model for validation problems.
 */
class HasProblemVisitor extends OasAllNodeVisitor {

    public problemsFound: boolean = false;

    protected doVisitNode(node: OasNode): void {
        if (node._validationProblems.length > 0) {
            this.problemsFound = true;
        }
    }

}
