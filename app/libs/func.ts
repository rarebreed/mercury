export class Just<T> {
    public constructor(protected value: T) {

    }

    public get(): T {
        return this.value;
    }
}

export type Maybe<T> = Just<T> | null;