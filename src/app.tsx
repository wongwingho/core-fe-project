import {ConnectedRouter, connectRouter, routerMiddleware} from "connected-react-router";
import createHistory from "history/createBrowserHistory";
import React, {ComponentType} from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {withRouter} from "react-router-dom";
import {applyMiddleware, compose, createStore, Dispatch, Middleware, MiddlewareAPI, Reducer, Store, StoreEnhancer} from "redux";
import createSagaMiddleware, {SagaIterator} from "redux-saga";
import {call, takeEvery} from "redux-saga/effects";
import {Handler, run, handlerListener} from "./action/handler";
import {INIT_STATE_ACTION_TYPE, initStateReducer} from "./action/init";
import {LOADING_ACTION_TYPE, loadingReducer} from "./action/loading";
import {registerHandler} from "./action/register";
import {ErrorBoundary} from "./component/ErrorBoundary";
import {errorAction} from "./exception";
import {initialState} from "./state";
import {Action, ActionHandlers, App, State} from "./type";

console.time("[framework] initialized");
const app = createApp();

export function render(component: ComponentType<any>, container: string): void {
    if (!component) {
        throw new Error("component must not be null");
    }
    const WithRouterComponent = withRouter(component);
    ReactDOM.render(
        <Provider store={app.store}>
            <ErrorBoundary>
                <ConnectedRouter history={app.history}>
                    <WithRouterComponent />
                </ConnectedRouter>
            </ErrorBoundary>
        </Provider>,
        document.getElementById(container)
    );
    console.timeEnd("[framework] initialized");
}

function devtools(enhancer: StoreEnhancer): StoreEnhancer {
    const production = process.env.NODE_ENV === "production";
    if (!production) {
        const extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        if (extension) {
            return compose(
                enhancer,
                extension({})
            );
        }
    }
    return enhancer;
}

function errorMiddleware(): Middleware<{}, State, Dispatch<any>> {
    return (store: MiddlewareAPI<Dispatch<any>, State>) => (next: Dispatch<Action<any>>) => (action: Action<any>): Action<any> => {
        try {
            return next(action);
        } catch (error) {
            return next(errorAction(error));
        }
    };
}

function* saga(effects: ActionHandlers): SagaIterator {
    yield takeEvery("*", function*(action: Action<any>) {
        const handlers = effects[action.type];
        if (handlers) {
            for (const handler of handlers) {
                yield call(run, handler, action.payload);
            }
        }
    });
}

function createRootReducer(reducers: ActionHandlers): Reducer<State, Action<any>> {
    return (rootState: State = initialState, action: Action<any>): State => {
        const nextState: State = rootState;

        if (action.type === LOADING_ACTION_TYPE) {
            nextState.loading = loadingReducer(rootState.loading, action);
            return nextState;
        }

        if (action.type === INIT_STATE_ACTION_TYPE) {
            nextState.app = initStateReducer(rootState.app, action);
            return nextState;
        }

        const handlers = reducers[action.type];
        if (handlers) {
            const previousAppState = rootState.app;
            const nextAppState = {...previousAppState};
            for (const handler of handlers) {
                nextAppState[handler.namespace!] = handler(...action.payload);
            }
            nextState.app = nextAppState;
            return nextState; // with our current design if action type is defined in handler, the state will always change
        }

        return rootState;
    };
}

function createApp(): App {
    console.info("[framework] initialize");

    const history = createHistory();
    const reducers = {};
    const effects = {};

    const sagaMiddleware = createSagaMiddleware();
    const rootReducer = createRootReducer(reducers);
    const reducer: Reducer<State, Action<any>> = connectRouter(history)(rootReducer as Reducer<State>);
    const store: Store<State, Action<any>> = createStore(reducer, devtools(applyMiddleware(errorMiddleware(), routerMiddleware(history), sagaMiddleware)));
    store.subscribe(handlerListener(store));
    sagaMiddleware.run(saga, effects);
    window.onerror = (message: string | Event, source?: string, line?: number, column?: number, error?: Error): boolean => {
        if (!error) {
            error = new Error(message.toString());
        }
        store.dispatch(errorAction(error));
        return true;
    };
    return {history, store, sagaMiddleware, effects, reducers, namespaces: new Set<string>()};
}

export function register(handler: Handler<any>): void {
    return registerHandler(handler, app);
}
