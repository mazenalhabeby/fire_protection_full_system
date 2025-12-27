import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import {
  BuyTokenDto,
  SellTokenDto,
  TokenInfoDto,
  TokenBalanceDto,
  TransactionQueryDto,
} from './dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Public()
  @Get('info')
  @ApiOperation({ summary: 'Get token information' })
  @ApiResponse({ status: 200, description: 'Token info', type: TokenInfoDto })
  async getTokenInfo() {
    return this.tokensService.getTokenInfo();
  }

  @Public()
  @Get('price')
  @ApiOperation({ summary: 'Get current token price' })
  @ApiResponse({ status: 200, description: 'Current token price' })
  async getPrice() {
    return this.tokensService.getPrice();
  }

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user token balance' })
  @ApiResponse({
    status: 200,
    description: 'User token balance',
    type: TokenBalanceDto,
  })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.tokensService.getBalance(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('buy')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buy tokens' })
  @ApiResponse({ status: 201, description: 'Tokens purchased successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async buyTokens(
    @CurrentUser('id') userId: string,
    @Body() buyTokenDto: BuyTokenDto,
  ) {
    return this.tokensService.buyTokens(userId, buyTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sell')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sell tokens' })
  @ApiResponse({ status: 201, description: 'Tokens sold successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  async sellTokens(
    @CurrentUser('id') userId: string,
    @Body() sellTokenDto: SellTokenDto,
  ) {
    return this.tokensService.sellTokens(userId, sellTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.tokensService.getTransactions(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(
    @CurrentUser('id') userId: string,
    @Param('id') transactionId: string,
  ) {
    return this.tokensService.getTransaction(userId, transactionId);
  }
}
