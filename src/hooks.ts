import React from "react";
import {Action, State} from "./reducer";
import {useDispatch, useSelector} from "react-redux";

type DeferLiteralArrayCheck<T> = T extends Array<string | number | boolean | null | undefined> ? T : never;

type DropLast<T extends any[]> = T extends [...infer I, infer L] ? I : never;

type ActionCreator<P extends any[]> = (...args: P) => Action<P>;

type Last<T extends readonly unknown[]> = T extends readonly [...infer _, infer U] ? U : T extends readonly [...infer _, (infer U)?] ? U | undefined : undefined;

export type Length<T extends any[]> = T["length"];

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
 * useUnaryAction(foo, 100, "") will return:
 * (c: boolean) => void;
 */
export function useUnaryAction<P extends any[]>(actionCreator: Length<P> extends 0 ? never : ActionCreator<P>, ...deps: DeferLiteralArrayCheck<DropLast<P>>): (arg: Last<P>) => void {
    const dispatch = useDispatch();
    // Need to cast back to P as deps could conditionally be never
    return React.useCallback((arg: Last<P>) => dispatch(actionCreator(...([...deps, arg] as P))), deps);
}

/**
 * For actions like:
 * *foo(a: number, b: string, c: boolean): SagaIterator {..}
 *
 * useBinaryAction(foo, 100) will return:
 * (b: string, c: boolean) => void;
 */
export function useBinaryAction<P extends any[]>(actionCreator: Length<P> extends 0 ? never : Length<P> extends 1 ? never : ActionCreator<P>, ...deps: DeferLiteralArrayCheck<DropLast<DropLast<P>>>): (arg1: Last<DropLast<P>>, arg2: Last<P>) => void {
    const dispatch = useDispatch();
    return React.useCallback((arg1: Last<DropLast<P>>, arg2: Last<P>) => dispatch(actionCreator(...([...deps, arg1, arg2] as P))), deps);
}

/**
 * For actions like:
 * *foo(data: {key: number}): SagaIterator {..}
 *
 * useModuleObjectAction(foo, "key") will return:
 * (objectValue: number) => void;
 */
export function useObjectKeyAction<T extends object, K extends keyof T>(actionCreator: ActionCreator<[T]>, objectKey: K): (objectValue: T[K]) => void {
    const dispatch = useDispatch();
    return React.useCallback((objectValue: T[K]) => dispatch(actionCreator({[objectKey]: objectValue} as T)), [dispatch, actionCreator, objectKey]);
}
