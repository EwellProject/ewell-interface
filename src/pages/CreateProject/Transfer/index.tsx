import React, { useCallback, useMemo, useState } from 'react';
import { useEffectOnce, useLocalStorage } from 'react-use';
import storages from '../storages';
import ButtonGroup from '../components/ButtonGroup';
import { CreateStepProps } from '../types';
import { ConfirmModal, SuccessModal } from './components/Modal';
import { ITradingParCard } from '../components/TradingPairList';
import { useTransfer } from './useTransfer';
import { emitLoading, emitSyncTipsModal } from 'utils/events';
import { message, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import ProjectInfo from 'pages/ProjectInfo';
import { getInfo } from '../utils';
import { PriceDecimal, TokenType } from 'constants/misc';
import { Typography, FontWeightEnum } from 'aelf-design';
import BigNumber from 'bignumber.js';
import { IProjectInfo, ProjectStatus } from 'types/project';
import { resetCreateProjectInfo } from '../utils';
import { divDecimals } from 'utils/calculate';
import { useMobile } from 'contexts/useStore/hooks';
import { getTokenInfo } from 'utils/assets';
import { TConfirmInfo } from './components/Modal';

interface SuccessInfo {
  supply?: number;
  transactionId?: string;
  projectId?: string;
}

const { Title } = Typography;

const Transfer: React.FC<CreateStepProps> = ({ onPre }) => {
  const [tradingPair] = useLocalStorage<ITradingParCard>(storages.ConfirmTradingPair);
  const [currency] = useLocalStorage<TokenType>(storages.Currency);
  const [additional] = useLocalStorage(storages.AdditionalInformation);
  const [idoInfo] = useLocalStorage<any>(storages.IDOInfo);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo>();
  const [contractAddress, setContractAddress] = useState('');
  const navigate = useNavigate();
  const { register, checkManagerSyncState, isStartTimeBeforeNow, getProjectAddress } = useTransfer();

  const toRaiseToken = useMemo(() => getTokenInfo(currency || TokenType.ELF), [currency]);

  const previewData = useMemo(() => {
    const { additionalInfo, ...data } = getInfo(tradingPair, idoInfo, additional, toRaiseToken);
    const { startTime, endTime, tokenReleaseTime, whitelistUrl } = idoInfo;
    return {
      ...data,
      startTime,
      endTime,
      toRaiseToken,
      contractAddress,
      tokenReleaseTime,
      additionalInfo: additionalInfo.data,
      crowdFundingIssueToken: tradingPair,
      unlockTime: tokenReleaseTime,
      status: ProjectStatus.UPCOMING,
      whitelistInfo: {
        url: whitelistUrl,
      },
      targetRaisedAmount: new BigNumber(data.crowdFundingIssueAmount)
        .div(divDecimals(data.preSalePrice, PriceDecimal))
        .toFixed(),
    } as TConfirmInfo;
  }, [additional, contractAddress, idoInfo, toRaiseToken, tradingPair]);

  const onTransfer = useCallback(async () => {
    try {
      setOpenConfirmModal(false);
      const isBefore = isStartTimeBeforeNow(idoInfo?.startTime);
      if (isBefore) {
        message.error('The sale start time has already passed. Please revise the sale information in step 3.');
        return;
      }
      emitLoading(true, { text: 'Synchronising data on the blockchain...' });
      const isSync = await checkManagerSyncState();
      if (!isSync) {
        emitLoading(false);
        emitSyncTipsModal(true);
        return;
      }

      const result: any = await register({ tradingPair, idoInfo, additional, toRaiseToken });
      console.log('createResult:', result);
      setSuccessInfo(result);
      resetCreateProjectInfo();
      setOpenSuccessModal(true);
    } catch (error: any) {
      console.log('register error', error);
      message.error(error?.message || 'register failed');
    } finally {
      emitLoading(false);
    }
  }, [additional, checkManagerSyncState, idoInfo, isStartTimeBeforeNow, register, toRaiseToken, tradingPair]);

  const gotoDetail = useCallback(() => {
    navigate(`/project/${successInfo?.projectId}`, { replace: true });
  }, [navigate, successInfo?.projectId]);

  const onNext = useCallback(() => {
    setOpenConfirmModal(true);
  }, []);

  const getContractAddress = useCallback(async () => {
    try {
      const contractAddress = await getProjectAddress();
      setContractAddress(contractAddress);
    } catch (error) {
      console.log('getContractAddress error', error);
    }
  }, [getProjectAddress]);

  useEffectOnce(() => {
    getContractAddress();
  });

  const isMobile = useMobile();
  const newProjectInfoMinHeight = useMemo(
    () => (isMobile ? 'calc(100vh - 64px - 120px - 188px - 96px)' : 'calc(100vh - 64px - 72px - 188px - 96px)'),
    [isMobile],
  );

  return (
    <div className="transfer-page">
      <Title
        level={6}
        fontWeight={FontWeightEnum.Medium}
        style={{
          padding: '48px 0',
        }}>
        Please review the sale details to ensure the accuracy of information. If everything is correct, you can finish
        the launch by clicking "Transfer" to send your tokens to an address.
      </Title>
      <ProjectInfo
        previewData={previewData}
        style={{
          minHeight: newProjectInfoMinHeight,
          padding: 0,
        }}
      />
      <ButtonGroup onPre={onPre} onNext={onNext} nextText="Transfer" style={{ margin: '24px 0 48px 0' }} />
      <ConfirmModal
        info={previewData}
        open={openConfirmModal}
        onCancel={() => setOpenConfirmModal(false)}
        onOk={onTransfer}
      />
      <SuccessModal
        info={{
          transactionId: successInfo?.transactionId,
          supply: successInfo?.supply,
          tokenSymbol: tradingPair?.symbol,
        }}
        open={openSuccessModal}
        onCancel={() => {
          setOpenSuccessModal(false);
          gotoDetail();
        }}
        onOk={gotoDetail}
      />
    </div>
  );
};

export default Transfer;
