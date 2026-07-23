import { NatsConnectionManager } from './nats-connection';
export interface RequestMessage<T = unknown> {
    id: string;
    subject: string;
    data: T;
    timestamp: number;
    timeout?: number;
}
export interface ResponseMessage<T = unknown> {
    requestId: string;
    data: T;
    error?: string;
    timestamp: number;
}
export interface RequestHandler<TRequest = unknown, TResponse = unknown> {
    (request: TRequest): Promise<TResponse> | TResponse;
}
export declare class RequestReplyManager {
    private connectionManager;
    private pendingRequests;
    private handlers;
    constructor(connectionManager: NatsConnectionManager);
    initialize(): Promise<void>;
    request<TRequest = unknown, TResponse = unknown>(subject: string, data: TRequest, timeout?: number): Promise<TResponse>;
    respond<TRequest = unknown, TResponse = unknown>(subject: string, handler: RequestHandler<TRequest, TResponse>): Promise<void>;
    private publishRequest;
    private publishResponse;
    handleIncomingRequest(requestJson: string): Promise<void>;
    handleIncomingResponse(responseJson: string): Promise<void>;
    private generateRequestId;
    getPendingRequestCount(): number;
    getRegisteredHandlers(): string[];
    cleanup(): Promise<void>;
}
export declare function createRequestReplyManager(connectionManager: NatsConnectionManager): RequestReplyManager;
//# sourceMappingURL=req-reply.d.ts.map