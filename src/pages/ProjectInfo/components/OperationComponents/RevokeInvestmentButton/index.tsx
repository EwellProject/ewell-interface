import { useEffect, useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { useParams } from 'react-router-dom';
import { Flex, message } from 'antd';
import { Button, Typography, FontWeightEnum, Modal, HashAddress } from 'aelf-design';
import SuccessModal from '../SuccessModal';
import { useWallet } from 'contexts/useWallet/hooks';
import { IProjectInfo } from 'types/project';
import { divDecimalsStr, timesDecimals } from 'utils/calculate';
import { DEFAULT_TOKEN_DECIMALS, DEFAULT_TOKEN_SYMBOL } from 'constants/misc';
import { emitLoading, emitSyncTipsModal } from 'utils/events';
import { DEFAULT_CHAIN_ID, NETWORK_CONFIG } from 'constants/network';
import { useTokenPrice, useTxFee } from 'contexts/useAssets/hooks';
import { renderTokenPrice } from 'utils/project';
import { useBalance } from 'hooks/useBalance';
import { getExploreLink, getLiquidatedDamageProportion } from 'utils';
import './styles.less';

const { Text } = Typography;

interface IRevokeInvestmentButtonProps {
  projectInfo?: IProjectInfo;
}

export default function RevokeInvestmentButton({ projectInfo }: IRevokeInvestmentButtonProps) {
  const { wallet, checkManagerSyncState } = useWallet();
  const { tokenPrice } = useTokenPrice(projectInfo?.toRaiseToken?.symbol);
  const { tokenPrice: elfTokenPrice } = useTokenPrice(DEFAULT_TOKEN_SYMBOL);
  const { txFee } = useTxFee();
  const [messageApi, contextHolder] = message.useMessage();
  const { projectId } = useParams();
  const { balance: defaultTokenBalance, updateBalance: updateDefaultTokenBalance } = useBalance(DEFAULT_TOKEN_SYMBOL);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (isSubmitModalOpen) {
      updateDefaultTokenBalance();
    }
  }, [updateDefaultTokenBalance, isSubmitModalOpen]);

  const txFeeAmount = useMemo(() => {
    return timesDecimals(txFee, DEFAULT_TOKEN_DECIMALS);
  }, [txFee]);

  const liquidatedDamageProportion = useMemo(() => {
    return getLiquidatedDamageProportion(projectInfo?.liquidatedDamageProportion);
  }, [projectInfo?.liquidatedDamageProportion]);

  const revokeAmount = useMemo(() => {
    const ratio = (100 - liquidatedDamageProportion) / 100;
    return new BigNumber(projectInfo?.investAmount ?? 0).times(ratio);
  }, [liquidatedDamageProportion, projectInfo?.investAmount]);

  const notEnoughTokens = useMemo(() => {
    return new BigNumber(defaultTokenBalance).lt(txFeeAmount);
  }, [defaultTokenBalance, txFeeAmount]);

  const handleSubmit = async () => {
    setIsSubmitModalOpen(false);
    emitLoading(true, { text: 'Synchronising data on the blockchain...' });
    const isManagerSynced = await checkManagerSyncState();
    if (!isManagerSynced) {
      emitLoading(false);
      emitSyncTipsModal(true);
      return;
    }
    try {
      const result = await wallet?.callContract<any, any>({
        contractAddress: NETWORK_CONFIG.ewellContractAddress,
        methodName: 'Disinvest',
        args: projectId,
      });
      console.log('Disinvest result', result);
      const { TransactionId } = result;
      setTransactionId(TransactionId);
      setIsSuccessModalOpen(true);
    } catch (error: any) {
      console.log('error', error);
      messageApi.open({
        type: 'error',
        content: error?.message || 'Disinvest failed',
      });
    } finally {
      emitLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Text
        className="revoke-investment-button cursor-pointer"
        fontWeight={FontWeightEnum.Medium}
        onClick={() => setIsConfirmModalOpen(true)}>
        Cancel Investment
      </Text>
      <Modal
        className="common-modal"
        title="Cancel Investment"
        footer={null}
        centered
        destroyOnClose
        open={isConfirmModalOpen}
        onCancel={() => {
          setIsConfirmModalOpen(false);
        }}>
        <Flex vertical gap={24}>
          <Text>
            {`Are you sure you want to cancel your investment? Upon cancellation, a penalty of ${liquidatedDamageProportion}% of the ${
              projectInfo?.toRaiseToken?.symbol || DEFAULT_TOKEN_SYMBOL
            } you invested will be deducted, and the remaining ${
              100 - liquidatedDamageProportion
            }% will be returned to you.`}
          </Text>
          <Flex className="mobile-flex-vertical-reverse" gap={16}>
            <Button className="flex-1" onClick={() => setIsConfirmModalOpen(false)}>
              Back
            </Button>
            <Button
              className="flex-1"
              type="primary"
              onClick={() => {
                setIsConfirmModalOpen(false);
                setIsSubmitModalOpen(true);
              }}>
              Cancel
            </Button>
          </Flex>
        </Flex>
      </Modal>
      <Modal
        className="common-modal"
        title="Cancel Investment"
        footer={null}
        centered
        destroyOnClose
        open={isSubmitModalOpen}
        onCancel={() => {
          setIsSubmitModalOpen(false);
        }}>
        <Flex vertical gap={24}>
          <Text>{`Upon clicking "Confirm," ${
            projectInfo?.toRaiseToken?.symbol || DEFAULT_TOKEN_SYMBOL
          } will be returned to the specified address.`}</Text>
          <Flex justify="space-between">
            <Text>My address</Text>
            <HashAddress
              className="hash-address-small"
              preLen={8}
              endLen={9}
              chain={DEFAULT_CHAIN_ID}
              address={wallet?.walletInfo.address || ''}
              addressClickCallback={(_, address) => {
                const exploreLink = address ? getExploreLink(address) : '';
                if (exploreLink) {
                  window.open(exploreLink, '_blank');
                }
              }}
            />
          </Flex>
          <Flex className="modal-box-data-wrapper" justify="space-between">
            <Text fontWeight={FontWeightEnum.Medium}>Available</Text>
            <Flex gap={8} align="baseline">
              <Text fontWeight={FontWeightEnum.Medium}>
                {divDecimalsStr(revokeAmount, projectInfo?.toRaiseToken?.decimals, '0')}{' '}
                {projectInfo?.toRaiseToken?.symbol ?? '--'}
              </Text>
              {renderTokenPrice({
                textProps: {
                  fontWeight: FontWeightEnum.Medium,
                  size: 'small',
                },
                amount: revokeAmount,
                decimals: projectInfo?.toRaiseToken?.decimals,
                tokenPrice,
              })}
            </Flex>
          </Flex>
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Flex className="mobile-flex-vertical-gap-0" gap={3}>
                <Text>Estimated</Text>
                <Text>Transaction Fee</Text>
              </Flex>
              <Flex className="mobile-flex-vertical-end-gap-2" gap={8} align="baseline">
                <Text>{`${txFee} ${DEFAULT_TOKEN_SYMBOL}`}</Text>
                {renderTokenPrice({
                  textProps: {
                    size: 'small',
                  },
                  amount: txFee,
                  decimals: 0,
                  tokenPrice: elfTokenPrice,
                })}
              </Flex>
            </Flex>
          </Flex>
          <Text
            className={clsx('error-text', 'text-center', { ['display-none']: !notEnoughTokens })}
            fontWeight={FontWeightEnum.Medium}>
            {`Insufficient balance to cover the transaction fee. Please transfer some ${DEFAULT_TOKEN_SYMBOL} to this address before you try again.`}
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
          title: 'Successfully Cancelled',
          open: isSuccessModalOpen,
          onCancel: () => {
            setIsSuccessModalOpen(false);
          },
          onOk: () => {
            setIsSuccessModalOpen(false);
          },
        }}
        data={{
          amountList: [
            {
              amount: divDecimalsStr(revokeAmount, projectInfo?.toRaiseToken?.decimals, '0'),
              symbol: projectInfo?.toRaiseToken?.symbol || '--',
            },
          ],
          description: 'Congratulations! Your investment has been successfully cancelled.',
          boxData: {
            label: 'Transaction ID',
            value: transactionId,
          },
        }}
      />
    </>
  );
}
