import { useMemo } from 'react';
import { Flex } from 'antd';
import { Button, Typography, FontWeightEnum, Modal, HashAddress, Tooltip } from 'aelf-design';
import { InfoCircleOutlined } from '@ant-design/icons';
import { wallet } from 'assets/images';
import { NumberFormat } from 'utils/format';
import { success } from 'assets/images';
import { DEFAULT_CHAIN_ID } from 'constants/network';
import { IProjectInfo } from 'types/project';
import { divDecimals, timesDecimals } from 'utils/calculate';
import { useTokenPrice, useTxFee } from 'contexts/useAssets/hooks';
import { useBalance } from 'hooks/useBalance';
import { TokenType, ZERO } from 'constants/misc';
import { getExploreLink } from 'utils';
import { ExplorerLinkType } from 'types/aelf';
import { infoCircle, question } from 'assets/images/icon/index';
import { useMobile } from 'contexts/useStore/hooks';

const { Text, Title } = Typography;

export type TConfirmInfo = IProjectInfo & { contractAddress: string };
interface ITransferModalProps {
  open: boolean;
  info: TConfirmInfo;
  onCancel: () => void;
  onOk: () => void;
}

export function ConfirmModal({ open, info, onCancel, onOk }: ITransferModalProps) {
  const { txFee } = useTxFee();
  const { tokenPrice } = useTokenPrice();
  const { balance: ELFBalance } = useBalance(TokenType.ELF);
  const { balance: tokenBalance } = useBalance(info?.crowdFundingIssueToken?.symbol);
  const isMobile = useMobile();

  const payGasELF = useMemo(() => ZERO.plus(txFee).times(2), [txFee]);

  const payGasUSD = useMemo(() => {
    const _tokenPrice = ZERO.plus(tokenPrice ?? 0);
    return ZERO.plus(payGasELF).times(_tokenPrice);
  }, [payGasELF, tokenPrice]);

  const isTokenEnough = useMemo(() => {
    const supplyToken = ZERO.plus(info?.crowdFundingIssueAmount ?? 0);
    const walletToken = ZERO.plus(tokenBalance ?? 0);

    if (supplyToken.lte(0) || walletToken.lte(0)) return false;
    return walletToken.gte(supplyToken);
  }, [info?.crowdFundingIssueAmount, tokenBalance]);

  const isGasEnough = useMemo(() => {
    console.log('efl-balance', ELFBalance);
    console.log('payGasELF', payGasELF.toNumber());
    const walletELF = ZERO.plus(ELFBalance ?? 0);
    return walletELF.gte(timesDecimals(payGasELF, TokenType.ELF));
  }, [ELFBalance, payGasELF]);

  const isDisabledSubmit = useMemo(() => !isGasEnough || !isTokenEnough, [isGasEnough, isTokenEnough]);

  const crowdFundingIssueAmountStr = useMemo(
    () => divDecimals(info.crowdFundingIssueAmount, info.crowdFundingIssueToken?.decimals).toFormat(),
    [info.crowdFundingIssueAmount, info.crowdFundingIssueToken?.decimals],
  );

  return (
    <>
      <Modal title="Confirm Transfer" footer={null} centered open={open} onCancel={onCancel}>
        <Flex vertical gap={24}>
          <Flex gap={8} justify="center" align="baseline">
            <Title fontWeight={FontWeightEnum.Medium} level={4}>
              {crowdFundingIssueAmountStr}
            </Title>
            <Title fontWeight={FontWeightEnum.Medium}>{info.crowdFundingIssueToken?.symbol || '--'}</Title>
          </Flex>
          <Flex vertical gap={8}>
            <Flex gap={4} align="flex-start">
              <img src={infoCircle} alt="" style={{ marginTop: 3, width: 12, height: 12 }} />
              <Text size="small">
                Unpon confirmation, tokens will be transferred to the address specified by ewell.
              </Text>
            </Flex>
            {info?.contractAddress && (
              <Flex className="modal-box-data-wrapper" justify="space-between" vertical={isMobile}>
                <Flex gap={4} align="center">
                  <Text fontWeight={FontWeightEnum.Medium}>Tokens stored at</Text>
                  <Tooltip
                    title="Both tokens for sale and funds raised from participants will be stored in this address, and you
                  can claim the funds raised along with any unsold tokens after the sale ends.">
                    <img src={question} style={{ width: 12, height: 12 }} />
                  </Tooltip>
                </Flex>
                <HashAddress
                  className="hash-address-small"
                  preLen={8}
                  endLen={9}
                  chain={DEFAULT_CHAIN_ID}
                  address={info?.contractAddress}
                  addressClickCallback={(_, address) => {
                    const exploreLink = address ? getExploreLink(address) : '';
                    if (exploreLink) {
                      window.open(exploreLink, '_blank');
                    }
                  }}
                />
              </Flex>
            )}
          </Flex>
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Flex gap={8}>
                <img src={wallet} style={{ width: 20, height: 20 }} alt="" />
                <Text fontWeight={FontWeightEnum.Bold}>Balance</Text>
              </Flex>
              <Flex>
                <Text fontWeight={FontWeightEnum.Bold}>
                  {divDecimals(tokenBalance, info.crowdFundingIssueToken?.decimals).toFormat()}{' '}
                  {info.crowdFundingIssueToken?.symbol || '--'}
                </Text>
              </Flex>
            </Flex>
            <Flex vertical gap={8}>
              <Flex justify="space-between">
                <Flex vertical={isMobile}>
                  <Text>Estimated </Text>
                  <Text>Transaction Fee</Text>
                </Flex>
                <Flex gap={8} align="baseline" vertical={isMobile}>
                  <Text>{payGasELF.toFormat()} ELF</Text>
                  {payGasUSD.gt(0) && (
                    <Text size="small" style={{ alignSelf: 'flex-end' }}>
                      $ {payGasUSD.toFormat(2)}
                    </Text>
                  )}
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          {isDisabledSubmit && (
            <Flex gap={24} justify="center">
              <Text fontWeight={FontWeightEnum.Bold} style={{ color: '#F53F3F', textAlign: 'center' }}>
                Insufficient balance. Please transfer some tokens to your wallet before you try again.
              </Text>
            </Flex>
          )}
          <Flex justify="center">
            <Button className="modal-single-button" type="primary" disabled={isDisabledSubmit} onClick={onOk}>
              Confirm
            </Button>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
}

interface SuccessInfo {
  transactionId?: string;
  supply?: number;
  tokenSymbol?: string;
}

interface ISuccessModalProps extends Omit<ITransferModalProps, 'info'> {
  info?: SuccessInfo;
}

export function SuccessModal({ open, info, onCancel, onOk }: ISuccessModalProps) {
  const isMobile = useMobile();

  return (
    <Modal title="Successfully Transferred" open={open} onCancel={onCancel} footer={null} centered>
      <Flex vertical gap={24}>
        <Flex vertical gap={8} align="center">
          <img className="success-icon" src={success} alt="success" style={{ width: 48, height: 48 }} />
          <Flex vertical>
            <Flex gap={8} align="baseline" justify="center">
              <Title fontWeight={FontWeightEnum.Medium} level={4}>
                {NumberFormat(info?.supply || '')}
              </Title>
              <Title fontWeight={FontWeightEnum.Medium}>{info?.tokenSymbol || '--'}</Title>
            </Flex>
          </Flex>
          <Text className="text-center" fontWeight={FontWeightEnum.Bold}>
            Congratulations! The tokens have been successfully transferred.
          </Text>
          <Text className="text-center">The sale has been created and you can view it now.</Text>
        </Flex>
        <Flex className="modal-box-data-wrapper" justify="space-between" vertical={isMobile}>
          <Text>Transaction ID</Text>
          <HashAddress
            className="hash-address-small"
            ignorePrefixSuffix
            preLen={8}
            endLen={9}
            address={info?.transactionId || ''}
            addressClickCallback={(address) => {
              const exploreLink = address ? getExploreLink(address, ExplorerLinkType.TRANSACTION) : '';
              if (exploreLink) {
                window.open(exploreLink, '_blank');
              }
            }}
          />
        </Flex>
        <Flex justify="center">
          <Button className="modal-single-button" type="primary" onClick={onOk}>
            View My Sale
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
