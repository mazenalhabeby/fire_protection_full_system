import { ApiProperty } from '@nestjs/swagger';

export class TokenPriceDto {
  @ApiProperty({ example: '0.03' })
  price: string;

  @ApiProperty({ example: 'HBCT' })
  symbol: string;

  @ApiProperty({ example: true })
  isPresale: boolean;
}

export class QuoteResponseDto {
  @ApiProperty({ example: '100' })
  amountUsd: string;

  @ApiProperty({ example: '3333.33333333' })
  tokensToReceive: string;

  @ApiProperty({ example: '0.03' })
  pricePerToken: string;

  @ApiProperty({ example: '10' })
  liquidityAllocation: string;

  @ApiProperty({ example: '90' })
  treasuryAllocation: string;
}

export class BuyTokensResponseDto {
  @ApiProperty()
  saleId: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  tokensReceived: string;

  @ApiProperty()
  pricePerToken: string;

  @ApiProperty()
  totalPaidUsd: string;

  @ApiProperty()
  treasuryAmount: string;

  @ApiProperty()
  liquidityAmount: string;

  @ApiProperty()
  status: string;
}

export class TokenSaleHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amountHbct: string;

  @ApiProperty()
  priceUsd: string;

  @ApiProperty()
  totalUsd: string;

  @ApiProperty()
  paymentToken: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;
}

export class SalesStatsDto {
  @ApiProperty()
  totalSalesUsd: string;

  @ApiProperty()
  totalTokensSold: string;

  @ApiProperty()
  totalLiquidityAdded: string;

  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  uniqueBuyers: number;
}
