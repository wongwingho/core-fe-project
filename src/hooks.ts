import React from "react";
import {Action, State} from "./reducer";
import {useDispatch, useSelector} from "react-redux";

type DeferLiteralArrayCheck<T> = T extends Array<string | number | boolean | null | undefined> ? T : never;

type NonEmpty<P extends any[], U> = Action<[...P, U] extends [] | [any] ? never : any[]>;

export function useLoadingStatus(identifier: string = "global"): boolean {
    return useSelector((state: State) => state.loading[identifier] > 0);
}

/**
 * Action parameters must be of primitive types, so that the dependency check can work well.
 * No need add dispatch to dep list, because it is always fixed.
 */
export function useAction<P extends Array<string | number | boolean | null | undefined>>(actionCreator: (...args: P) => Action<P>, ...deps: P): () => void {
    const dispatch = useDispatch();
    return React.useCallback(() => dispatch(actionCreator(...deps)), deps);
}

/**
 * For actions like:
 * *foo(a: number, b: string, c: boolean): SagaIterator {..}
 *
 * useModuleAction(foo, 100, "") will return:
 * (c: boolean) => void;
 */
export function useUnaryAction<P extends any[], U>(actionCreator: (...args: [...P, U]) => NonEmpty<DeferLiteralArrayCheck<P>, U>, ...deps: P): (arg: U) => void {
    const dispatch = useDispatch();
    return React.useCallback((arg: U) => dispatch(actionCreator(...deps, arg)), deps);
}

/**
 * For actions like:
 * *foo(data: {key: number}): SagaIterator {..}
 *
 * useModuleObjectAction(foo, "key") will return:
 * (objectValue: number) => void;
 */
export function useObjectKeyAction<T extends object, K extends keyof T>(actionCreator: (arg: T) => Action<[T]>, objectKey: K): (objectValue: T[K]) => void {
    const dispatch = useDispatch();
    return React.useCallback((objectValue: T[K]) => dispatch(actionCreator({[objectKey]: objectValue} as T)), [dispatch, actionCreator, objectKey]);
}
