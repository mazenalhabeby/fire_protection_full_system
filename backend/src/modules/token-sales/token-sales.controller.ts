import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TokenSalesService } from './token-sales.service';
import {
  BuyTokensDto,
  TokenSaleQuoteDto,
  TokenPriceDto,
  QuoteResponseDto,
  BuyTokensResponseDto,
  SalesStatsDto,
} from './dto';

@ApiTags('Token Sales')
@Controller('token-sales')
export class TokenSalesController {
  constructor(private readonly tokenSalesService: TokenSalesService) {}

  @Get('price')
  @ApiOperation({ summary: 'Get current token price' })
  @ApiResponse({ status: 200, type: TokenPriceDto })
  async getPrice(): Promise<TokenPriceDto> {
    return this.tokenSalesService.getPrice();
  }

  @Post('quote')
  @ApiOperation({ summary: 'Get a quote for token purchase' })
  @ApiResponse({ status: 200, type: QuoteResponseDto })
  async getQuote(@Body() quoteDto: TokenSaleQuoteDto): Promise<QuoteResponseDto> {
    return this.tokenSalesService.getQuote(quoteDto);
  }

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buy tokens' })
  @ApiResponse({ status: 201, type: BuyTokensResponseDto })
  async buyTokens(
    @Request() req: { user: { userId: string } },
    @Body() buyDto: BuyTokensDto,
  ): Promise<BuyTokensResponseDto> {
    return this.tokenSalesService.buyTokens(req.user.userId, buyDto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user purchase history' })
  async getSaleHistory(
    @Request() req: { user: { userId: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.tokenSalesService.getSaleHistory(
      req.user.userId,
      Number(page),
      Number(limit),
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sales statistics (Admin)' })
  @ApiResponse({ status: 200, type: SalesStatsDto })
  async getSalesStats(): Promise<SalesStatsDto> {
    // TODO: Add admin role check
    return this.tokenSalesService.getSalesStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sale details by ID' })
  async getSaleById(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.tokenSalesService.getSaleById(id, req.user.userId);
  }
}
