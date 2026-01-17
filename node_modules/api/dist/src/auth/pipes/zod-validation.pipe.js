"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const common_1 = require("@nestjs/common");
class ZodValidationPipe {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    transform(value, metadata) {
        try {
            const parsedValue = this.schema.parse(value);
            return parsedValue;
        }
        catch (error) {
            throw new common_1.BadRequestException(error?.errors ?? error?.message ?? error);
        }
    }
}
exports.ZodValidationPipe = ZodValidationPipe;
//# sourceMappingURL=zod-validation.pipe.js.map