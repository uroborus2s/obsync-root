export interface GatewayMiddlewareConfig {
  requestIdHeader: string;
}

const middlewareConfig: GatewayMiddlewareConfig = {
  requestIdHeader: 'x-request-id'
};

export default middlewareConfig;
