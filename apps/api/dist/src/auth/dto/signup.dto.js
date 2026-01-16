"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupSchema = void 0;
const zod_1 = require("zod");
exports.SignupSchema = zod_1.z.object({
    email: zod_1.z.email(),
    name: zod_1.z.string(),
    password: zod_1.z.string().min(8),
});
//# sourceMappingURL=signup.dto.js.map