// Type declarations for bullmq (externalized module)
// This file satisfies TypeScript during build when bullmq is externalized via webpack

declare module 'bullmq' {
    export interface QueueOptions {
        connection?: {
            host?: string;
            port?: number;
            password?: string;
            db?: number;
        } | any;
        prefix?: string;
        defaultJobOptions?: JobsOptions;
        createClient?: (type: 'client' | 'subscriber' | 'bclient', config?: any) => any;
    }

    export interface JobsOptions {
        attempts?: number;
        backoff?: {
            type: 'fixed' | 'exponential';
            delay: number;
        } | number;
        delay?: number;
        lifo?: boolean;
        priority?: number;
        removeOnComplete?: boolean | number | { count?: number; age?: number };
        removeOnFail?: boolean | number | { count?: number; age?: number };
        repeat?: {
            pattern?: string;
            every?: number;
            limit?: number;
            immediately?: boolean;
        };
        jobId?: string;
        timestamp?: number;
    }

    export interface WorkerOptions extends QueueOptions {
        concurrency?: number;
        limiter?: {
            max: number;
            duration: number;
        };
        lockDuration?: number;
        maxStalledCount?: number;
        stalledInterval?: number;
        settings?: object;
    }

    export interface Job<T = any, R = any, N extends string = string> {
        id?: string;
        name: N;
        data: T;
        opts: JobsOptions;
        progress: number;
        returnvalue: R;
        stacktrace: string[];
        timestamp: number;
        attemptsMade: number;
        failedReason?: string;
        finishedOn?: number;
        processedOn?: number;

        updateProgress(progress: number | object): Promise<void>;
        log(row: string): Promise<number>;
        moveToCompleted(returnValue: R, token: string, fetchNext?: boolean): Promise<any>;
        moveToFailed(err: Error, token: string, fetchNext?: boolean): Promise<void>;
        remove(): Promise<void>;
        retry(state?: 'completed' | 'failed'): Promise<void>;
        getState(): Promise<string>;
        changePriority(opts: { priority?: number; lifo?: boolean }): Promise<void>;
    }

    export class Queue<T = any, R = any, N extends string = string> {
        name: string;
        opts: QueueOptions;

        constructor(name: string, opts?: QueueOptions);

        add(name: N, data: T, opts?: JobsOptions): Promise<Job<T, R, N>>;
        addBulk(jobs: { name: N; data: T; opts?: JobsOptions }[]): Promise<Job<T, R, N>[]>;
        pause(): Promise<void>;
        resume(): Promise<void>;
        getJob(jobId: string): Promise<Job<T, R, N> | undefined>;
        getJobs(types: string | string[], start?: number, end?: number, asc?: boolean): Promise<Job<T, R, N>[]>;
        getJobCounts(...types: string[]): Promise<{ [key: string]: number }>;
        getJobState(jobId: string): Promise<string>;
        getCompleted(start?: number, end?: number): Promise<Job<T, R, N>[]>;
        getFailed(start?: number, end?: number): Promise<Job<T, R, N>[]>;
        getDelayed(start?: number, end?: number): Promise<Job<T, R, N>[]>;
        getActive(start?: number, end?: number): Promise<Job<T, R, N>[]>;
        getWaiting(start?: number, end?: number): Promise<Job<T, R, N>[]>;
        clean(grace: number, limit: number, type?: string): Promise<string[]>;
        obliterate(opts?: { force?: boolean }): Promise<void>;
        close(): Promise<void>;
        disconnect(): Promise<void>;

        on(event: 'error', callback: (error: Error) => void): this;
        on(event: 'waiting', callback: (job: Job<T, R, N>) => void): this;
        on(event: 'active', callback: (job: Job<T, R, N>) => void): this;
        on(event: 'completed', callback: (job: Job<T, R, N>, result: R) => void): this;
        on(event: 'failed', callback: (job: Job<T, R, N>, error: Error) => void): this;
        on(event: 'progress', callback: (job: Job<T, R, N>, progress: number) => void): this;
        on(event: string, callback: (...args: any[]) => void): this;
    }

    export class Worker<T = any, R = any, N extends string = string> {
        name: string;
        opts: WorkerOptions;

        constructor(
            name: string,
            processor: (job: Job<T, R, N>, token?: string) => Promise<R>,
            opts?: WorkerOptions
        );

        pause(doNotWaitActive?: boolean): Promise<void>;
        resume(): Promise<void>;
        close(force?: boolean): Promise<void>;
        run(): Promise<void>;

        on(event: 'error', callback: (error: Error) => void): this;
        on(event: 'active', callback: (job: Job<T, R, N>, prev: string) => void): this;
        on(event: 'completed', callback: (job: Job<T, R, N>, result: R, prev: string) => void): this;
        on(event: 'failed', callback: (job: Job<T, R, N> | undefined, error: Error, prev: string) => void): this;
        on(event: 'progress', callback: (job: Job<T, R, N>, progress: number | object) => void): this;
        on(event: 'stalled', callback: (jobId: string, prev: string) => void): this;
        on(event: 'drained', callback: () => void): this;
        on(event: 'closing', callback: (msg: string) => void): this;
        on(event: 'closed', callback: () => void): this;
        on(event: string, callback: (...args: any[]) => void): this;
    }

    export class QueueEvents {
        constructor(name: string, opts?: QueueOptions);

        on(event: 'completed', callback: (args: { jobId: string; returnvalue: string }) => void): this;
        on(event: 'failed', callback: (args: { jobId: string; failedReason: string }) => void): this;
        on(event: 'progress', callback: (args: { jobId: string; data: number | object }) => void): this;
        on(event: 'waiting', callback: (args: { jobId: string }) => void): this;
        on(event: string, callback: (...args: any[]) => void): this;

        close(): Promise<void>;
    }

    export class QueueScheduler {
        constructor(name: string, opts?: QueueOptions);
        close(): Promise<void>;
    }
}
