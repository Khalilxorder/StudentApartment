// Type declarations for ioredis (externalized module)
// This file satisfies TypeScript during build when ioredis is externalized via webpack

declare module 'ioredis' {
    export interface RedisOptions {
        port?: number;
        host?: string;
        family?: number;
        path?: string;
        keepAlive?: number;
        connectionName?: string;
        password?: string;
        db?: number;
        enableReadyCheck?: boolean;
        maxRetriesPerRequest?: number | null;
        enableOfflineQueue?: boolean;
        connectTimeout?: number;
        autoResubscribe?: boolean;
        autoResendUnfulfilledCommands?: boolean;
        lazyConnect?: boolean;
        tls?: object;
        keyPrefix?: string;
        retryStrategy?: (times: number) => number | void | null;
        reconnectOnError?: (err: Error) => boolean | 1 | 2;
        readOnly?: boolean;
        stringNumbers?: boolean;
        enableAutoPipelining?: boolean;
    }

    export class Redis {
        constructor(url?: string);
        constructor(url: string, options?: RedisOptions);
        constructor(port?: number, host?: string, options?: RedisOptions);
        constructor(options?: RedisOptions);

        // Event handlers
        on(event: 'connect', callback: () => void): this;
        on(event: 'ready', callback: () => void): this;
        on(event: 'error', callback: (err: Error) => void): this;
        on(event: 'close', callback: () => void): this;
        on(event: 'reconnecting', callback: () => void): this;
        on(event: 'end', callback: () => void): this;
        on(event: string, callback: (...args: any[]) => void): this;

        // Basic commands
        get(key: string): Promise<string | null>;
        set(key: string, value: string | Buffer | number): Promise<'OK'>;
        setex(key: string, seconds: number, value: string | Buffer | number): Promise<'OK'>;
        del(...keys: string[]): Promise<number>;
        exists(...keys: string[]): Promise<number>;
        expire(key: string, seconds: number): Promise<number>;
        ttl(key: string): Promise<number>;

        // Hash commands
        hget(key: string, field: string): Promise<string | null>;
        hset(key: string, field: string, value: string | Buffer | number): Promise<number>;
        hgetall(key: string): Promise<Record<string, string>>;
        hdel(key: string, ...fields: string[]): Promise<number>;

        // Set commands
        sadd(key: string, ...members: (string | Buffer | number)[]): Promise<number>;
        smembers(key: string): Promise<string[]>;
        srem(key: string, ...members: (string | Buffer | number)[]): Promise<number>;

        // List commands
        lpush(key: string, ...values: (string | Buffer | number)[]): Promise<number>;
        rpush(key: string, ...values: (string | Buffer | number)[]): Promise<number>;
        lpop(key: string): Promise<string | null>;
        rpop(key: string): Promise<string | null>;
        lrange(key: string, start: number, stop: number): Promise<string[]>;

        // Sorted set commands
        zadd(key: string, ...args: (string | Buffer | number)[]): Promise<number>;
        zrange(key: string, start: number, stop: number): Promise<string[]>;
        zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]>;

        // Utility
        ping(): Promise<string>;
        quit(): Promise<'OK'>;
        disconnect(): void;
        flushdb(): Promise<'OK'>;
        flushall(): Promise<'OK'>;
        keys(pattern: string): Promise<string[]>;

        // Pipeline
        pipeline(): Pipeline;
        multi(): Pipeline;
    }

    export interface Pipeline {
        get(key: string): this;
        set(key: string, value: string | Buffer | number): this;
        del(...keys: string[]): this;
        exec(): Promise<[Error | null, any][]>;
    }

    export default Redis;
}
