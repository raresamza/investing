import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
export type JwtPayload = {
    sub: string;
    name: string;
    email: string;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): Promise<{
        userId: string;
        email: string;
        name: string;
    }>;
}
export {};
