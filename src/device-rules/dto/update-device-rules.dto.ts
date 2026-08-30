
import { IsArray, IsObject, ValidateNested, IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class RuleActionDto {
  @IsNumber()
  relay: number;

  @IsString()
  state: 'on' | 'off' | 'on-for';

  @IsNumber()
  @IsOptional()
  duration?: number;
}

class RuleConditionDto {
    @IsString()
    @IsOptional()
    sensor?: string;
  
    @IsString()
    @IsOptional()
    operator?: '>' | '<' | '=';
  
    @IsNumber()
    @IsOptional()
    value?: number;

    @IsString()
    @IsOptional()
    time?: string; // e.g. "20:00-06:00"
}

class RuleConditionsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RuleConditionDto)
    @IsOptional()
    and?: RuleConditionDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RuleConditionDto)
    @IsOptional()
    or?: RuleConditionDto[];
}

class RuleDto {
  @IsString()
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RuleConditionsDto)
  conditions: RuleConditionsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions: RuleActionDto[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateDeviceRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules: RuleDto[];
}
