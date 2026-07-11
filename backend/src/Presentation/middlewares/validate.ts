import { Request, Response, NextFunction, RequestHandler } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

export function validateDto<T extends object>(DtoClass: new () => T): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(DtoClass, req.body);
    const errors = await validate(dto, { whitelist: true });

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.map((e) => ({ property: e.property, constraints: e.constraints })),
      });
    }
    req.body = dto;
    next();
  };
}