/* */ 
"format cjs";
import { StringMapWrapper } from 'angular2/src/facade/collection';
import { isPresent, isBlank, normalizeBlank, CONST_EXPR } from 'angular2/src/facade/lang';
import { PromiseWrapper } from 'angular2/src/facade/async';
/**
 * `RouteParams` is an immutable map of parameters for the given route
 * based on the url matcher and optional parameters for that route.
 *
 * You can inject `RouteParams` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig, RouteParams} from
 * 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, name: 'UserCmp'},
 * ])
 * class AppCmp {}
 *
 * @Component({ template: 'user: {{id}}' })
 * class UserCmp {
 *   id: string;
 *   constructor(params: RouteParams) {
 *     this.id = params.get('id');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
export class RouteParams {
    constructor(params) {
        this.params = params;
    }
    get(param) { return normalizeBlank(StringMapWrapper.get(this.params, param)); }
}
/**
 * `RouteData` is an immutable map of additional data you can configure in your {@link Route}.
 *
 * You can inject `RouteData` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig, RouteData} from
 * 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, name: 'UserCmp', data: {isAdmin: true}},
 * ])
 * class AppCmp {}
 *
 * @Component({...})
 * @View({ template: 'user: {{isAdmin}}' })
 * class UserCmp {
 *   string: isAdmin;
 *   constructor(data: RouteData) {
 *     this.isAdmin = data.get('isAdmin');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
export class RouteData {
    constructor(data = CONST_EXPR({})) {
        this.data = data;
    }
    get(key) { return normalizeBlank(StringMapWrapper.get(this.data, key)); }
}
export var BLANK_ROUTE_DATA = new RouteData();
/**
 * `Instruction` is a tree of {@link ComponentInstruction}s with all the information needed
 * to transition each component in the app to a given route, including all auxiliary routes.
 *
 * `Instruction`s can be created using {@link Router#generate}, and can be used to
 * perform route changes with {@link Router#navigateByInstruction}.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   constructor(router: Router) {
 *     var instruction = router.generate(['/MyRoute']);
 *     router.navigateByInstruction(instruction);
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
export class Instruction {
    constructor(component, child, auxInstruction) {
        this.component = component;
        this.child = child;
        this.auxInstruction = auxInstruction;
    }
    get urlPath() { return isPresent(this.component) ? this.component.urlPath : ''; }
    get urlParams() { return isPresent(this.component) ? this.component.urlParams : []; }
    get specificity() {
        var total = '';
        if (isPresent(this.component)) {
            total += this.component.specificity;
        }
        if (isPresent(this.child)) {
            total += this.child.specificity;
        }
        return total;
    }
    /**
     * converts the instruction into a URL string
     */
    toRootUrl() { return this.toUrlPath() + this.toUrlQuery(); }
    /** @internal */
    _toNonRootUrl() {
        return this._stringifyPathMatrixAuxPrefixed() +
            (isPresent(this.child) ? this.child._toNonRootUrl() : '');
    }
    toUrlQuery() { return this.urlParams.length > 0 ? ('?' + this.urlParams.join('&')) : ''; }
    /**
     * Returns a new instruction that shares the state of the existing instruction, but with
     * the given child {@link Instruction} replacing the existing child.
     */
    replaceChild(child) {
        return new ResolvedInstruction(this.component, child, this.auxInstruction);
    }
    /**
     * If the final URL for the instruction is ``
     */
    toUrlPath() {
        return this.urlPath + this._stringifyAux() +
            (isPresent(this.child) ? this.child._toNonRootUrl() : '');
    }
    // default instructions override these
    toLinkUrl() {
        return this.urlPath + this._stringifyAux() +
            (isPresent(this.child) ? this.child._toLinkUrl() : '');
    }
    // this is the non-root version (called recursively)
    /** @internal */
    _toLinkUrl() {
        return this._stringifyPathMatrixAuxPrefixed() +
            (isPresent(this.child) ? this.child._toLinkUrl() : '');
    }
    /** @internal */
    _stringifyPathMatrixAuxPrefixed() {
        var primary = this._stringifyPathMatrixAux();
        if (primary.length > 0) {
            primary = '/' + primary;
        }
        return primary;
    }
    /** @internal */
    _stringifyMatrixParams() {
        return this.urlParams.length > 0 ? (';' + this.urlParams.join(';')) : '';
    }
    /** @internal */
    _stringifyPathMatrixAux() {
        if (isBlank(this.component)) {
            return '';
        }
        return this.urlPath + this._stringifyMatrixParams() + this._stringifyAux();
    }
    /** @internal */
    _stringifyAux() {
        var routes = [];
        StringMapWrapper.forEach(this.auxInstruction, (auxInstruction, _) => {
            routes.push(auxInstruction._stringifyPathMatrixAux());
        });
        if (routes.length > 0) {
            return '(' + routes.join('//') + ')';
        }
        return '';
    }
}
/**
 * a resolved instruction has an outlet instruction for itself, but maybe not for...
 */
export class ResolvedInstruction extends Instruction {
    constructor(component, child, auxInstruction) {
        super(component, child, auxInstruction);
    }
    resolveComponent() {
        return PromiseWrapper.resolve(this.component);
    }
}
/**
 * Represents a resolved default route
 */
export class DefaultInstruction extends Instruction {
    constructor(component, child) {
        super(component, child, {});
    }
    resolveComponent() {
        return PromiseWrapper.resolve(this.component);
    }
    toLinkUrl() { return ''; }
    /** @internal */
    _toLinkUrl() { return ''; }
}
/**
 * Represents a component that may need to do some redirection or lazy loading at a later time.
 */
export class UnresolvedInstruction extends Instruction {
    constructor(_resolver, _urlPath = '', _urlParams = CONST_EXPR([])) {
        super(null, null, {});
        this._resolver = _resolver;
        this._urlPath = _urlPath;
        this._urlParams = _urlParams;
    }
    get urlPath() {
        if (isPresent(this.component)) {
            return this.component.urlPath;
        }
        if (isPresent(this._urlPath)) {
            return this._urlPath;
        }
        return '';
    }
    get urlParams() {
        if (isPresent(this.component)) {
            return this.component.urlParams;
        }
        if (isPresent(this._urlParams)) {
            return this._urlParams;
        }
        return [];
    }
    resolveComponent() {
        if (isPresent(this.component)) {
            return PromiseWrapper.resolve(this.component);
        }
        return this._resolver().then((resolution) => {
            this.child = resolution.child;
            return this.component = resolution.component;
        });
    }
}
export class RedirectInstruction extends ResolvedInstruction {
    constructor(component, child, auxInstruction, _specificity) {
        super(component, child, auxInstruction);
        this._specificity = _specificity;
    }
    get specificity() { return this._specificity; }
}
/**
 * A `ComponentInstruction` represents the route state for a single component. An `Instruction` is
 * composed of a tree of these `ComponentInstruction`s.
 *
 * `ComponentInstructions` is a public API. Instances of `ComponentInstruction` are passed
 * to route lifecycle hooks, like {@link CanActivate}.
 *
 * `ComponentInstruction`s are [hash consed](https://en.wikipedia.org/wiki/Hash_consing). You should
 * never construct one yourself with "new." Instead, rely on {@link Router/RouteRecognizer} to
 * construct `ComponentInstruction`s.
 *
 * You should not modify this object. It should be treated as immutable.
 */
export class ComponentInstruction {
    constructor(urlPath, urlParams, data, componentType, terminal, specificity, params = null) {
        this.urlPath = urlPath;
        this.urlParams = urlParams;
        this.componentType = componentType;
        this.terminal = terminal;
        this.specificity = specificity;
        this.params = params;
        this.reuse = false;
        this.routeData = isPresent(data) ? data : BLANK_ROUTE_DATA;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdHJ1Y3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmd1bGFyMi9zcmMvcm91dGVyL2luc3RydWN0aW9uLnRzIl0sIm5hbWVzIjpbIlJvdXRlUGFyYW1zIiwiUm91dGVQYXJhbXMuY29uc3RydWN0b3IiLCJSb3V0ZVBhcmFtcy5nZXQiLCJSb3V0ZURhdGEiLCJSb3V0ZURhdGEuY29uc3RydWN0b3IiLCJSb3V0ZURhdGEuZ2V0IiwiSW5zdHJ1Y3Rpb24iLCJJbnN0cnVjdGlvbi5jb25zdHJ1Y3RvciIsIkluc3RydWN0aW9uLnVybFBhdGgiLCJJbnN0cnVjdGlvbi51cmxQYXJhbXMiLCJJbnN0cnVjdGlvbi5zcGVjaWZpY2l0eSIsIkluc3RydWN0aW9uLnRvUm9vdFVybCIsIkluc3RydWN0aW9uLl90b05vblJvb3RVcmwiLCJJbnN0cnVjdGlvbi50b1VybFF1ZXJ5IiwiSW5zdHJ1Y3Rpb24ucmVwbGFjZUNoaWxkIiwiSW5zdHJ1Y3Rpb24udG9VcmxQYXRoIiwiSW5zdHJ1Y3Rpb24udG9MaW5rVXJsIiwiSW5zdHJ1Y3Rpb24uX3RvTGlua1VybCIsIkluc3RydWN0aW9uLl9zdHJpbmdpZnlQYXRoTWF0cml4QXV4UHJlZml4ZWQiLCJJbnN0cnVjdGlvbi5fc3RyaW5naWZ5TWF0cml4UGFyYW1zIiwiSW5zdHJ1Y3Rpb24uX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXgiLCJJbnN0cnVjdGlvbi5fc3RyaW5naWZ5QXV4IiwiUmVzb2x2ZWRJbnN0cnVjdGlvbiIsIlJlc29sdmVkSW5zdHJ1Y3Rpb24uY29uc3RydWN0b3IiLCJSZXNvbHZlZEluc3RydWN0aW9uLnJlc29sdmVDb21wb25lbnQiLCJEZWZhdWx0SW5zdHJ1Y3Rpb24iLCJEZWZhdWx0SW5zdHJ1Y3Rpb24uY29uc3RydWN0b3IiLCJEZWZhdWx0SW5zdHJ1Y3Rpb24ucmVzb2x2ZUNvbXBvbmVudCIsIkRlZmF1bHRJbnN0cnVjdGlvbi50b0xpbmtVcmwiLCJEZWZhdWx0SW5zdHJ1Y3Rpb24uX3RvTGlua1VybCIsIlVucmVzb2x2ZWRJbnN0cnVjdGlvbiIsIlVucmVzb2x2ZWRJbnN0cnVjdGlvbi5jb25zdHJ1Y3RvciIsIlVucmVzb2x2ZWRJbnN0cnVjdGlvbi51cmxQYXRoIiwiVW5yZXNvbHZlZEluc3RydWN0aW9uLnVybFBhcmFtcyIsIlVucmVzb2x2ZWRJbnN0cnVjdGlvbi5yZXNvbHZlQ29tcG9uZW50IiwiUmVkaXJlY3RJbnN0cnVjdGlvbiIsIlJlZGlyZWN0SW5zdHJ1Y3Rpb24uY29uc3RydWN0b3IiLCJSZWRpcmVjdEluc3RydWN0aW9uLnNwZWNpZmljaXR5IiwiQ29tcG9uZW50SW5zdHJ1Y3Rpb24iLCJDb21wb25lbnRJbnN0cnVjdGlvbi5jb25zdHJ1Y3RvciJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBa0IsZ0JBQWdCLEVBQWMsTUFBTSxnQ0FBZ0M7T0FDdEYsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBUSxVQUFVLEVBQUMsTUFBTSwwQkFBMEI7T0FDdEYsRUFBVSxjQUFjLEVBQUMsTUFBTSwyQkFBMkI7QUFHakU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQThCRztBQUNIO0lBQ0VBLFlBQW1CQSxNQUErQkE7UUFBL0JDLFdBQU1BLEdBQU5BLE1BQU1BLENBQXlCQTtJQUFHQSxDQUFDQTtJQUV0REQsR0FBR0EsQ0FBQ0EsS0FBYUEsSUFBWUUsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNqR0YsQ0FBQ0E7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBOEJHO0FBQ0g7SUFDRUcsWUFBbUJBLElBQUlBLEdBQXlCQSxVQUFVQSxDQUFDQSxFQUFFQSxDQUFDQTtRQUEzQ0MsU0FBSUEsR0FBSkEsSUFBSUEsQ0FBdUNBO0lBQUdBLENBQUNBO0lBRWxFRCxHQUFHQSxDQUFDQSxHQUFXQSxJQUFT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LCBTdHJpbmdNYXBXcmFwcGVyLCBMaXN0V3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9jb2xsZWN0aW9uJztcbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rLCBub3JtYWxpemVCbGFuaywgVHlwZSwgQ09OU1RfRVhQUn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcbmltcG9ydCB7UHJvbWlzZSwgUHJvbWlzZVdyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvYXN5bmMnO1xuXG5cbi8qKlxuICogYFJvdXRlUGFyYW1zYCBpcyBhbiBpbW11dGFibGUgbWFwIG9mIHBhcmFtZXRlcnMgZm9yIHRoZSBnaXZlbiByb3V0ZVxuICogYmFzZWQgb24gdGhlIHVybCBtYXRjaGVyIGFuZCBvcHRpb25hbCBwYXJhbWV0ZXJzIGZvciB0aGF0IHJvdXRlLlxuICpcbiAqIFlvdSBjYW4gaW5qZWN0IGBSb3V0ZVBhcmFtc2AgaW50byB0aGUgY29uc3RydWN0b3Igb2YgYSBjb21wb25lbnQgdG8gdXNlIGl0LlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBpbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG4gKiBpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnYW5ndWxhcjIvcGxhdGZvcm0vYnJvd3Nlcic7XG4gKiBpbXBvcnQge1JvdXRlciwgUk9VVEVSX0RJUkVDVElWRVMsIFJPVVRFUl9QUk9WSURFUlMsIFJvdXRlQ29uZmlnLCBSb3V0ZVBhcmFtc30gZnJvbVxuICogJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQENvbXBvbmVudCh7ZGlyZWN0aXZlczogW1JPVVRFUl9ESVJFQ1RJVkVTXX0pXG4gKiBAUm91dGVDb25maWcoW1xuICogIHtwYXRoOiAnL3VzZXIvOmlkJywgY29tcG9uZW50OiBVc2VyQ21wLCBuYW1lOiAnVXNlckNtcCd9LFxuICogXSlcbiAqIGNsYXNzIEFwcENtcCB7fVxuICpcbiAqIEBDb21wb25lbnQoeyB0ZW1wbGF0ZTogJ3VzZXI6IHt7aWR9fScgfSlcbiAqIGNsYXNzIFVzZXJDbXAge1xuICogICBpZDogc3RyaW5nO1xuICogICBjb25zdHJ1Y3RvcihwYXJhbXM6IFJvdXRlUGFyYW1zKSB7XG4gKiAgICAgdGhpcy5pZCA9IHBhcmFtcy5nZXQoJ2lkJyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBib290c3RyYXAoQXBwQ21wLCBST1VURVJfUFJPVklERVJTKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUm91dGVQYXJhbXMge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSkge31cblxuICBnZXQocGFyYW06IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBub3JtYWxpemVCbGFuayhTdHJpbmdNYXBXcmFwcGVyLmdldCh0aGlzLnBhcmFtcywgcGFyYW0pKTsgfVxufVxuXG4vKipcbiAqIGBSb3V0ZURhdGFgIGlzIGFuIGltbXV0YWJsZSBtYXAgb2YgYWRkaXRpb25hbCBkYXRhIHlvdSBjYW4gY29uZmlndXJlIGluIHlvdXIge0BsaW5rIFJvdXRlfS5cbiAqXG4gKiBZb3UgY2FuIGluamVjdCBgUm91dGVEYXRhYCBpbnRvIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNvbXBvbmVudCB0byB1c2UgaXQuXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCB7Q29tcG9uZW50fSBmcm9tICdhbmd1bGFyMi9jb3JlJztcbiAqIGltcG9ydCB7Ym9vdHN0cmFwfSBmcm9tICdhbmd1bGFyMi9wbGF0Zm9ybS9icm93c2VyJztcbiAqIGltcG9ydCB7Um91dGVyLCBST1VURVJfRElSRUNUSVZFUywgUk9VVEVSX1BST1ZJREVSUywgUm91dGVDb25maWcsIFJvdXRlRGF0YX0gZnJvbVxuICogJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQENvbXBvbmVudCh7ZGlyZWN0aXZlczogW1JPVVRFUl9ESVJFQ1RJVkVTXX0pXG4gKiBAUm91dGVDb25maWcoW1xuICogIHtwYXRoOiAnL3VzZXIvOmlkJywgY29tcG9uZW50OiBVc2VyQ21wLCBuYW1lOiAnVXNlckNtcCcsIGRhdGE6IHtpc0FkbWluOiB0cnVlfX0sXG4gKiBdKVxuICogY2xhc3MgQXBwQ21wIHt9XG4gKlxuICogQENvbXBvbmVudCh7Li4ufSlcbiAqIEBWaWV3KHsgdGVtcGxhdGU6ICd1c2VyOiB7e2lzQWRtaW59fScgfSlcbiAqIGNsYXNzIFVzZXJDbXAge1xuICogICBzdHJpbmc6IGlzQWRtaW47XG4gKiAgIGNvbnN0cnVjdG9yKGRhdGE6IFJvdXRlRGF0YSkge1xuICogICAgIHRoaXMuaXNBZG1pbiA9IGRhdGEuZ2V0KCdpc0FkbWluJyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBib290c3RyYXAoQXBwQ21wLCBST1VURVJfUFJPVklERVJTKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUm91dGVEYXRhIHtcbiAgY29uc3RydWN0b3IocHVibGljIGRhdGE6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0gQ09OU1RfRVhQUih7fSkpIHt9XG5cbiAgZ2V0KGtleTogc3RyaW5nKTogYW55IHsgcmV0dXJuIG5vcm1hbGl6ZUJsYW5rKFN0cmluZ01hcFdyYXBwZXIuZ2V0KHRoaXMuZGF0YSwga2V5KSk7IH1cbn1cblxuZXhwb3J0IHZhciBCTEFOS19ST1VURV9EQVRBID0gbmV3IFJvdXRlRGF0YSgpO1xuXG4vKipcbiAqIGBJbnN0cnVjdGlvbmAgaXMgYSB0cmVlIG9mIHtAbGluayBDb21wb25lbnRJbnN0cnVjdGlvbn1zIHdpdGggYWxsIHRoZSBpbmZvcm1hdGlvbiBuZWVkZWRcbiAqIHRvIHRyYW5zaXRpb24gZWFjaCBjb21wb25lbnQgaW4gdGhlIGFwcCB0byBhIGdpdmVuIHJvdXRlLCBpbmNsdWRpbmcgYWxsIGF1eGlsaWFyeSByb3V0ZXMuXG4gKlxuICogYEluc3RydWN0aW9uYHMgY2FuIGJlIGNyZWF0ZWQgdXNpbmcge0BsaW5rIFJvdXRlciNnZW5lcmF0ZX0sIGFuZCBjYW4gYmUgdXNlZCB0b1xuICogcGVyZm9ybSByb3V0ZSBjaGFuZ2VzIHdpdGgge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb259LlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBpbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG4gKiBpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnYW5ndWxhcjIvcGxhdGZvcm0vYnJvd3Nlcic7XG4gKiBpbXBvcnQge1JvdXRlciwgUk9VVEVSX0RJUkVDVElWRVMsIFJPVVRFUl9QUk9WSURFUlMsIFJvdXRlQ29uZmlnfSBmcm9tICdhbmd1bGFyMi9yb3V0ZXInO1xuICpcbiAqIEBDb21wb25lbnQoe2RpcmVjdGl2ZXM6IFtST1VURVJfRElSRUNUSVZFU119KVxuICogQFJvdXRlQ29uZmlnKFtcbiAqICB7Li4ufSxcbiAqIF0pXG4gKiBjbGFzcyBBcHBDbXAge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIHZhciBpbnN0cnVjdGlvbiA9IHJvdXRlci5nZW5lcmF0ZShbJy9NeVJvdXRlJ10pO1xuICogICAgIHJvdXRlci5uYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24pO1xuICogICB9XG4gKiB9XG4gKlxuICogYm9vdHN0cmFwKEFwcENtcCwgUk9VVEVSX1BST1ZJREVSUyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEluc3RydWN0aW9uIHtcbiAgY29uc3RydWN0b3IocHVibGljIGNvbXBvbmVudDogQ29tcG9uZW50SW5zdHJ1Y3Rpb24sIHB1YmxpYyBjaGlsZDogSW5zdHJ1Y3Rpb24sXG4gICAgICAgICAgICAgIHB1YmxpYyBhdXhJbnN0cnVjdGlvbjoge1trZXk6IHN0cmluZ106IEluc3RydWN0aW9ufSkge31cblxuICBnZXQgdXJsUGF0aCgpOiBzdHJpbmcgeyByZXR1cm4gaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSA/IHRoaXMuY29tcG9uZW50LnVybFBhdGggOiAnJzsgfVxuXG4gIGdldCB1cmxQYXJhbXMoKTogc3RyaW5nW10geyByZXR1cm4gaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSA/IHRoaXMuY29tcG9uZW50LnVybFBhcmFtcyA6IFtdOyB9XG5cbiAgZ2V0IHNwZWNpZmljaXR5KCk6IHN0cmluZyB7XG4gICAgdmFyIHRvdGFsID0gJyc7XG4gICAgaWYgKGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkpIHtcbiAgICAgIHRvdGFsICs9IHRoaXMuY29tcG9uZW50LnNwZWNpZmljaXR5O1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KHRoaXMuY2hpbGQpKSB7XG4gICAgICB0b3RhbCArPSB0aGlzLmNoaWxkLnNwZWNpZmljaXR5O1xuICAgIH1cbiAgICByZXR1cm4gdG90YWw7XG4gIH1cblxuICBhYnN0cmFjdCByZXNvbHZlQ29tcG9uZW50KCk6IFByb21pc2U8Q29tcG9uZW50SW5zdHJ1Y3Rpb24+O1xuXG4gIC8qKlxuICAgKiBjb252ZXJ0cyB0aGUgaW5zdHJ1Y3Rpb24gaW50byBhIFVSTCBzdHJpbmdcbiAgICovXG4gIHRvUm9vdFVybCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy50b1VybFBhdGgoKSArIHRoaXMudG9VcmxRdWVyeSgpOyB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfdG9Ob25Sb290VXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXhQcmVmaXhlZCgpICtcbiAgICAgICAgICAgKGlzUHJlc2VudCh0aGlzLmNoaWxkKSA/IHRoaXMuY2hpbGQuX3RvTm9uUm9vdFVybCgpIDogJycpO1xuICB9XG5cbiAgdG9VcmxRdWVyeSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy51cmxQYXJhbXMubGVuZ3RoID4gMCA/ICgnPycgKyB0aGlzLnVybFBhcmFtcy5qb2luKCcmJykpIDogJyc7IH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBpbnN0cnVjdGlvbiB0aGF0IHNoYXJlcyB0aGUgc3RhdGUgb2YgdGhlIGV4aXN0aW5nIGluc3RydWN0aW9uLCBidXQgd2l0aFxuICAgKiB0aGUgZ2l2ZW4gY2hpbGQge0BsaW5rIEluc3RydWN0aW9ufSByZXBsYWNpbmcgdGhlIGV4aXN0aW5nIGNoaWxkLlxuICAgKi9cbiAgcmVwbGFjZUNoaWxkKGNoaWxkOiBJbnN0cnVjdGlvbik6IEluc3RydWN0aW9uIHtcbiAgICByZXR1cm4gbmV3IFJlc29sdmVkSW5zdHJ1Y3Rpb24odGhpcy5jb21wb25lbnQsIGNoaWxkLCB0aGlzLmF1eEluc3RydWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB0aGUgZmluYWwgVVJMIGZvciB0aGUgaW5zdHJ1Y3Rpb24gaXMgYGBcbiAgICovXG4gIHRvVXJsUGF0aCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlBdXgoKSArXG4gICAgICAgICAgIChpc1ByZXNlbnQodGhpcy5jaGlsZCkgPyB0aGlzLmNoaWxkLl90b05vblJvb3RVcmwoKSA6ICcnKTtcbiAgfVxuXG4gIC8vIGRlZmF1bHQgaW5zdHJ1Y3Rpb25zIG92ZXJyaWRlIHRoZXNlXG4gIHRvTGlua1VybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlBdXgoKSArXG4gICAgICAgICAgIChpc1ByZXNlbnQodGhpcy5jaGlsZCkgPyB0aGlzLmNoaWxkLl90b0xpbmtVcmwoKSA6ICcnKTtcbiAgfVxuXG4gIC8vIHRoaXMgaXMgdGhlIG5vbi1yb290IHZlcnNpb24gKGNhbGxlZCByZWN1cnNpdmVseSlcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfdG9MaW5rVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXhQcmVmaXhlZCgpICtcbiAgICAgICAgICAgKGlzUHJlc2VudCh0aGlzLmNoaWxkKSA/IHRoaXMuY2hpbGQuX3RvTGlua1VybCgpIDogJycpO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc3RyaW5naWZ5UGF0aE1hdHJpeEF1eFByZWZpeGVkKCk6IHN0cmluZyB7XG4gICAgdmFyIHByaW1hcnkgPSB0aGlzLl9zdHJpbmdpZnlQYXRoTWF0cml4QXV4KCk7XG4gICAgaWYgKHByaW1hcnkubGVuZ3RoID4gMCkge1xuICAgICAgcHJpbWFyeSA9ICcvJyArIHByaW1hcnk7XG4gICAgfVxuICAgIHJldHVybiBwcmltYXJ5O1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc3RyaW5naWZ5TWF0cml4UGFyYW1zKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsUGFyYW1zLmxlbmd0aCA+IDAgPyAoJzsnICsgdGhpcy51cmxQYXJhbXMuam9pbignOycpKSA6ICcnO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc3RyaW5naWZ5UGF0aE1hdHJpeEF1eCgpOiBzdHJpbmcge1xuICAgIGlmIChpc0JsYW5rKHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy51cmxQYXRoICsgdGhpcy5fc3RyaW5naWZ5TWF0cml4UGFyYW1zKCkgKyB0aGlzLl9zdHJpbmdpZnlBdXgoKTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3N0cmluZ2lmeUF1eCgpOiBzdHJpbmcge1xuICAgIHZhciByb3V0ZXMgPSBbXTtcbiAgICBTdHJpbmdNYXBXcmFwcGVyLmZvckVhY2godGhpcy5hdXhJbnN0cnVjdGlvbiwgKGF1eEluc3RydWN0aW9uLCBfKSA9PiB7XG4gICAgICByb3V0ZXMucHVzaChhdXhJbnN0cnVjdGlvbi5fc3RyaW5naWZ5UGF0aE1hdHJpeEF1eCgpKTtcbiAgICB9KTtcbiAgICBpZiAocm91dGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiAnKCcgKyByb3V0ZXMuam9pbignLy8nKSArICcpJztcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG59XG5cblxuLyoqXG4gKiBhIHJlc29sdmVkIGluc3RydWN0aW9uIGhhcyBhbiBvdXRsZXQgaW5zdHJ1Y3Rpb24gZm9yIGl0c2VsZiwgYnV0IG1heWJlIG5vdCBmb3IuLi5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVkSW5zdHJ1Y3Rpb24gZXh0ZW5kcyBJbnN0cnVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGNvbXBvbmVudDogQ29tcG9uZW50SW5zdHJ1Y3Rpb24sIGNoaWxkOiBJbnN0cnVjdGlvbixcbiAgICAgICAgICAgICAgYXV4SW5zdHJ1Y3Rpb246IHtba2V5OiBzdHJpbmddOiBJbnN0cnVjdGlvbn0pIHtcbiAgICBzdXBlcihjb21wb25lbnQsIGNoaWxkLCBhdXhJbnN0cnVjdGlvbik7XG4gIH1cblxuICByZXNvbHZlQ29tcG9uZW50KCk6IFByb21pc2U8Q29tcG9uZW50SW5zdHJ1Y3Rpb24+IHtcbiAgICByZXR1cm4gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZSh0aGlzLmNvbXBvbmVudCk7XG4gIH1cbn1cblxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZXNvbHZlZCBkZWZhdWx0IHJvdXRlXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0SW5zdHJ1Y3Rpb24gZXh0ZW5kcyBJbnN0cnVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGNvbXBvbmVudDogQ29tcG9uZW50SW5zdHJ1Y3Rpb24sIGNoaWxkOiBEZWZhdWx0SW5zdHJ1Y3Rpb24pIHtcbiAgICBzdXBlcihjb21wb25lbnQsIGNoaWxkLCB7fSk7XG4gIH1cblxuICByZXNvbHZlQ29tcG9uZW50KCk6IFByb21pc2U8Q29tcG9uZW50SW5zdHJ1Y3Rpb24+IHtcbiAgICByZXR1cm4gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZSh0aGlzLmNvbXBvbmVudCk7XG4gIH1cblxuICB0b0xpbmtVcmwoKTogc3RyaW5nIHsgcmV0dXJuICcnOyB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfdG9MaW5rVXJsKCk6IHN0cmluZyB7IHJldHVybiAnJzsgfVxufVxuXG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNvbXBvbmVudCB0aGF0IG1heSBuZWVkIHRvIGRvIHNvbWUgcmVkaXJlY3Rpb24gb3IgbGF6eSBsb2FkaW5nIGF0IGEgbGF0ZXIgdGltZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVucmVzb2x2ZWRJbnN0cnVjdGlvbiBleHRlbmRzIEluc3RydWN0aW9uIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfcmVzb2x2ZXI6ICgpID0+IFByb21pc2U8SW5zdHJ1Y3Rpb24+LCBwcml2YXRlIF91cmxQYXRoOiBzdHJpbmcgPSAnJyxcbiAgICAgICAgICAgICAgcHJpdmF0ZSBfdXJsUGFyYW1zOiBzdHJpbmdbXSA9IENPTlNUX0VYUFIoW10pKSB7XG4gICAgc3VwZXIobnVsbCwgbnVsbCwge30pO1xuICB9XG5cbiAgZ2V0IHVybFBhdGgoKTogc3RyaW5nIHtcbiAgICBpZiAoaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnVybFBhdGg7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQodGhpcy5fdXJsUGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl91cmxQYXRoO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBnZXQgdXJsUGFyYW1zKCk6IHN0cmluZ1tdIHtcbiAgICBpZiAoaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnVybFBhcmFtcztcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudCh0aGlzLl91cmxQYXJhbXMpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdXJsUGFyYW1zO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICByZXNvbHZlQ29tcG9uZW50KCk6IFByb21pc2U8Q29tcG9uZW50SW5zdHJ1Y3Rpb24+IHtcbiAgICBpZiAoaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLnJlc29sdmUodGhpcy5jb21wb25lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZXIoKS50aGVuKChyZXNvbHV0aW9uOiBJbnN0cnVjdGlvbikgPT4ge1xuICAgICAgdGhpcy5jaGlsZCA9IHJlc29sdXRpb24uY2hpbGQ7XG4gICAgICByZXR1cm4gdGhpcy5jb21wb25lbnQgPSByZXNvbHV0aW9uLmNvbXBvbmVudDtcbiAgICB9KTtcbiAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBSZWRpcmVjdEluc3RydWN0aW9uIGV4dGVuZHMgUmVzb2x2ZWRJbnN0cnVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGNvbXBvbmVudDogQ29tcG9uZW50SW5zdHJ1Y3Rpb24sIGNoaWxkOiBJbnN0cnVjdGlvbixcbiAgICAgICAgICAgICAgYXV4SW5zdHJ1Y3Rpb246IHtba2V5OiBzdHJpbmddOiBJbnN0cnVjdGlvbn0sIHByaXZhdGUgX3NwZWNpZmljaXR5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihjb21wb25lbnQsIGNoaWxkLCBhdXhJbnN0cnVjdGlvbik7XG4gIH1cblxuICBnZXQgc3BlY2lmaWNpdHkoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX3NwZWNpZmljaXR5OyB9XG59XG5cblxuLyoqXG4gKiBBIGBDb21wb25lbnRJbnN0cnVjdGlvbmAgcmVwcmVzZW50cyB0aGUgcm91dGUgc3RhdGUgZm9yIGEgc2luZ2xlIGNvbXBvbmVudC4gQW4gYEluc3RydWN0aW9uYCBpc1xuICogY29tcG9zZWQgb2YgYSB0cmVlIG9mIHRoZXNlIGBDb21wb25lbnRJbnN0cnVjdGlvbmBzLlxuICpcbiAqIGBDb21wb25lbnRJbnN0cnVjdGlvbnNgIGlzIGEgcHVibGljIEFQSS4gSW5zdGFuY2VzIG9mIGBDb21wb25lbnRJbnN0cnVjdGlvbmAgYXJlIHBhc3NlZFxuICogdG8gcm91dGUgbGlmZWN5Y2xlIGhvb2tzLCBsaWtlIHtAbGluayBDYW5BY3RpdmF0ZX0uXG4gKlxuICogYENvbXBvbmVudEluc3RydWN0aW9uYHMgYXJlIFtoYXNoIGNvbnNlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSGFzaF9jb25zaW5nKS4gWW91IHNob3VsZFxuICogbmV2ZXIgY29uc3RydWN0IG9uZSB5b3Vyc2VsZiB3aXRoIFwibmV3LlwiIEluc3RlYWQsIHJlbHkgb24ge0BsaW5rIFJvdXRlci9Sb3V0ZVJlY29nbml6ZXJ9IHRvXG4gKiBjb25zdHJ1Y3QgYENvbXBvbmVudEluc3RydWN0aW9uYHMuXG4gKlxuICogWW91IHNob3VsZCBub3QgbW9kaWZ5IHRoaXMgb2JqZWN0LiBJdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBpbW11dGFibGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRJbnN0cnVjdGlvbiB7XG4gIHJldXNlOiBib29sZWFuID0gZmFsc2U7XG4gIHB1YmxpYyByb3V0ZURhdGE6IFJvdXRlRGF0YTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgdXJsUGF0aDogc3RyaW5nLCBwdWJsaWMgdXJsUGFyYW1zOiBzdHJpbmdbXSwgZGF0YTogUm91dGVEYXRhLFxuICAgICAgICAgICAgICBwdWJsaWMgY29tcG9uZW50VHlwZSwgcHVibGljIHRlcm1pbmFsOiBib29sZWFuLCBwdWJsaWMgc3BlY2lmaWNpdHk6IHN0cmluZyxcbiAgICAgICAgICAgICAgcHVibGljIHBhcmFtczoge1trZXk6IHN0cmluZ106IGFueX0gPSBudWxsKSB7XG4gICAgdGhpcy5yb3V0ZURhdGEgPSBpc1ByZXNlbnQoZGF0YSkgPyBkYXRhIDogQkxBTktfUk9VVEVfREFUQTtcbiAgfVxufVxuIl19