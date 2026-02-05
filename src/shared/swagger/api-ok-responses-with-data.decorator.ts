import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../dtos';

export function ApiOkResponseWithData<TModel extends Type<any>>(
  model: TModel,
  description,
) {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
              message: {
                example: description,
              },
            },
          },
        ],
      },
    }),
  );
}
