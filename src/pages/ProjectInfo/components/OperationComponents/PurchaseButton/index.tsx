import { useEffect, useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import { useParams } from 'react-router-dom';
import { Flex, message } from 'antd';
import { Button, FontWeightEnum, HashAddress, Modal, Typography } from 'aelf-design';
import ProjectLogo from 'components/ProjectLogo';
import SuccessModal from '../SuccessModal';
import { wallet as walletIcon } from 'assets/images';
import { IProjectInfo } from 'types/project';
import { DEFAULT_CHAIN_ID, NETWORK_CONFIG } from 'constants/network';
import { divDecimals, divDecimalsStr } from 'utils/calculate';
import { getExploreLink, getPriceDecimal } from 'utils';
import { useWallet } from 'contexts/useWallet/hooks';
import { emitLoading, emitSyncTipsModal } from 'utils/events';
import { timesDecimals } from 'utils/calculate';
import { useTokenPrice, useTxFee } from 'contexts/useAssets/hooks';
import { renderTokenPrice } from 'utils/project';
import { useBalance } from 'hooks/useBalance';
import { useViewContract } from 'contexts/useViewContract/hooks';
import './styles.less';
import { DEFAULT_TOKEN_DECIMALS, DEFAULT_TOKEN_SYMBOL } from 'constants/misc';
import clsx from 'clsx';

const { Title, Text } = Typography;

export interface IPurchaseButtonProps {
  buttonDisabled?: boolean;
  projectInfo?: IProjectInfo;
  purchaseAmount?: string;
  handleClearInput: () => void;
}

export default function PurchaseButton({
  buttonDisabled,
  projectInfo,
  purchaseAmount,
  handleClearInput,
}: IPurchaseButtonProps) {
  const { projectId } = useParams();
  const { additionalInfo } = projectInfo || {};
  const { wallet, checkManagerSyncState } = useWallet();
  const { checkIsNeedApprove } = useViewContract();
  const { tokenPrice } = useTokenPrice(projectInfo?.toRaiseToken?.symbol);
  const { tokenPrice: elfTokenPrice } = useTokenPrice(DEFAULT_TOKEN_SYMBOL);
  const { txFee } = useTxFee();
  const [messageApi, contextHolder] = message.useMessage();
  const { balance: toRaiseTokenBalance, updateBalance: updateToRaiseTokenBalance } = useBalance(
    projectInfo?.toRaiseToken?.symbol,
  );
  const { balance: defaultTokenBalance, updateBalance: updateDefaultTokenBalance } = useBalance(DEFAULT_TOKEN_SYMBOL);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (isSubmitModalOpen) {
      updateToRaiseTokenBalance();
      updateDefaultTokenBalance();
    }
  }, [updateToRaiseTokenBalance, updateDefaultTokenBalance, isSubmitModalOpen]);

  const allocationAmount = useMemo(() => {
    return timesDecimals(purchaseAmount, projectInfo?.toRaiseToken?.decimals);
  }, [projectInfo?.toRaiseToken?.decimals, purchaseAmount]);

  const totalAllocationAmount = useMemo(() => {
    return new BigNumber(projectInfo?.investAmount ?? 0).plus(allocationAmount);
  }, [allocationAmount, projectInfo?.investAmount]);

  const totalTxFee = useMemo(() => {
    return new BigNumber(txFee || 0).times(2);
  }, [txFee]);

  const notEnoughTokens = useMemo(() => {
    const totalTxFeeAmount = timesDecimals(totalTxFee, DEFAULT_TOKEN_DECIMALS);
    return new BigNumber(defaultTokenBalance ?? 0).lt(totalTxFeeAmount);
  }, [defaultTokenBalance, totalTxFee]);

  const handleSubmit = async () => {
    setIsSubmitModalOpen(false);
    emitLoading(true, { text: 'Synchronising data on the blockchain...' });
    const isManagerSynced = await checkManagerSyncState();
    if (!isManagerSynced) {
      emitLoading(false);
      emitSyncTipsModal(true);
      return;
    }

    const amount = allocationAmount.toFixed();
    let needApprove = false;
    try {
      needApprove = await checkIsNeedApprove({
        symbol: projectInfo?.toRaiseToken?.symbol || '',
        amount,
        owner: wallet?.walletInfo.address || '',
        spender: NETWORK_CONFIG.ewellContractAddress,
      });
      console.log('checkIsNeedApprove result', needApprove);
    } catch (error: any) {
      console.log('error', error);
      messageApi.open({
        type: 'error',
        content: error?.message || 'GetApproveAmount failed',
      });
      emitLoading(false);
      return;
    }

    if (needApprove) {
      try {
        const approveResult = await wallet?.callContract({
          contractAddress: NETWORK_CONFIG.sideChainInfo.tokenContractAddress,
          methodName: 'Approve',
          args: {
            spender: NETWORK_CONFIG.ewellContractAddress,
            symbol: projectInfo?.toRaiseToken?.symbol,
            amount,
          },
        });
        console.log('approveResult', approveResult);
      } catch (error: any) {
        console.log('error', error);
        messageApi.open({
          type: 'error',
          content: error?.message || 'Approve failed',
        });
        emitLoading(false);
        return;
      }
    }

    try {
      const result = await wallet?.callContract<any, any>({
        contractAddress: NETWORK_CONFIG.ewellContractAddress,
        methodName: 'Invest',
        args: {
          projectId,
          symbol: projectInfo?.toRaiseToken?.symbol,
          investAmount: amount,
        },
      });
      console.log('Invest result', result);
      const { TransactionId } = result;
      setTransactionId(TransactionId);
      setIsSuccessModalOpen(true);
    } catch (error: any) {
      console.log('error', error);
      messageApi.open({
        type: 'error',
        content: error?.message || 'Invest failed',
      });
    } finally {
      emitLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    handleClearInput();
    setIsSuccessModalOpen(false);
  };

  return (
    <>
      {contextHolder}
      <Button
        type="primary"
        disabled={buttonDisabled}
        onClick={() => {
          setIsSubmitModalOpen(true);
        }}>
        Purchase
      </Button>
      <Modal
        className="purchase-submit-modal-wrapper common-modal"
        title="Confirm Purchase"
        footer={null}
        centered
        destroyOnClose
        open={isSubmitModalOpen}
        onCancel={() => {
          setIsSubmitModalOpen(false);
        }}>
        <Flex vertical gap={24}>
          <Flex align="center" gap={12}>
            <ProjectLogo key={additionalInfo?.logoUrl} src={additionalInfo?.logoUrl} alt="logo" />
            <Title fontWeight={FontWeightEnum.Medium}>{additionalInfo?.projectName}</Title>
          </Flex>
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Text>Tokens stored at</Text>
              <HashAddress
                className="hash-address-small"
                preLen={8}
                endLen={9}
                chain={DEFAULT_CHAIN_ID}
                address={projectInfo?.virtualAddress || ''}
                addressClickCallback={(_, address) => {
                  const exploreLink = address ? getExploreLink(address) : '';
                  if (exploreLink) {
                    window.open(exploreLink, '_blank');
                  }
                }}
              />
            </Flex>
            <Flex justify="space-between">
              <Text>My Allocation</Text>
              <Text>
                {divDecimalsStr(totalAllocationAmount, projectInfo?.toRaiseToken?.decimals ?? 8)}{' '}
                {projectInfo?.toRaiseToken?.symbol ?? '--'}
              </Text>
            </Flex>
            <Flex justify="space-between">
              <Text>To Receive</Text>
              <Text>
                {divDecimals(totalAllocationAmount, projectInfo?.toRaiseToken?.decimals)
                  .times(
                    divDecimals(
                      projectInfo?.preSalePrice ?? 0,
                      getPriceDecimal(projectInfo?.crowdFundingIssueToken, projectInfo?.toRaiseToken),
                    ),
                  )
                  .toFormat()}{' '}
                {projectInfo?.crowdFundingIssueToken?.symbol ?? '--'}
              </Text>
            </Flex>
          </Flex>
          <Flex className="modal-box-data-wrapper" justify="space-between">
            <Flex align="center" gap={8}>
              <img src={walletIcon} alt="wallet" />
              <Text fontWeight={FontWeightEnum.Medium}>Balance</Text>
            </Flex>
            <Text fontWeight={FontWeightEnum.Medium}>
              {divDecimalsStr(toRaiseTokenBalance, projectInfo?.toRaiseToken?.decimals ?? 8)}{' '}
              {projectInfo?.toRaiseToken?.symbol ?? '--'}
            </Text>
          </Flex>
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Text>Allocation</Text>
              <Flex className="mobile-flex-vertical-end-gap-2" gap={8} align="baseline">
                <Text>
                  {divDecimalsStr(purchaseAmount, 0)} {projectInfo?.toRaiseToken?.symbol ?? '--'}
                </Text>
                {renderTokenPrice({
                  textProps: {
                    size: 'small',
                  },
                  amount: purchaseAmount,
                  decimals: 0,
                  tokenPrice,
                })}
              </Flex>
            </Flex>
            <Flex justify="space-between">
              <Flex className="mobile-flex-vertical-gap-0" gap={3}>
                <Text>Estimated</Text>
                <Text>Transaction Fee</Text>
              </Flex>
              <Flex className="mobile-flex-vertical-end-gap-2" gap={8} align="baseline">
                <Text>{`${totalTxFee.toFixed()} ${DEFAULT_TOKEN_SYMBOL}`}</Text>
                {renderTokenPrice({
                  textProps: {
                    size: 'small',
                  },
                  amount: totalTxFee,
                  decimals: 0,
                  tokenPrice: elfTokenPrice,
                })}
              </Flex>
            </Flex>
          </Flex>
          <Text
            className={clsx('error-text', 'text-center', { ['display-none']: !notEnoughTokens })}
            fontWeight={FontWeightEnum.Medium}>
            Not enough token in the wallet
          </Text>
          <Flex justify="center">
            <Button className="modal-single-button" type="primary" disabled={notEnoughTokens} onClick={handleSubmit}>
              Confirm
            </Button>
          </Flex>
        </Flex>
      </Modal>
      <SuccessModal
        modalProps={{
          title: 'Successfully Purchased',
          open: isSuccessModalOpen,
          onCancel: handleSuccessModalClose,
          onOk: handleSuccessModalClose,
        }}
        data={{
          amountList: [
            {
              amount: divDecimalsStr(purchaseAmount, 0),
              symbol: projectInfo?.toRaiseToken?.symbol ?? '--',
            },
          ],
          description: 'Congratulations! The purchase has been successfully made.',
          boxData: {
            label: 'Transaction ID',
            value: transactionId,
          },
        }}
      />
    </>
  );
}
