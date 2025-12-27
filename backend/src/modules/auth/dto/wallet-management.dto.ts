import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class GenerateLinkingNonceDto {
  @IsString()
  @IsNotEmpty({ message: 'Wallet address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum wallet address' })
  walletAddress: string;
}

export class LinkWalletDto {
  @IsString()
  @IsNotEmpty({ message: 'Wallet address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum wallet address' })
  walletAddress: string;

  @IsString()
  @IsNotEmpty({ message: 'Signature is required' })
  signature: string;

  @IsString()
  @IsNotEmpty({ message: 'Nonce is required' })
  nonce: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Label must be 50 characters or less' })
  label?: string;
}

export class UpdateWalletLabelDto {
  @IsString()
  @IsNotEmpty({ message: 'Label is required' })
  @MaxLength(50, { message: 'Label must be 50 characters or less' })
  label: string;
}

export class CheckWalletSwitchDto {
  @IsString()
  @IsNotEmpty({ message: 'Wallet address is required' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum wallet address' })
  walletAddress: string;
}
