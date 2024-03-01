import { DEFAULT_CHAIN_ID, NETWORK_CONFIG } from 'constants/network';
import { useWallet } from 'contexts/useWallet/hooks';
import { useCallback } from 'react';
import { getLog } from 'utils/protoUtils';
import { request } from 'api';
import { divDecimals } from 'utils/calculate';
import { getInfo } from '../utils';
import { handleLoopFetch } from 'utils';
import dayjs from 'dayjs';
import { useViewContract } from 'contexts/useViewContract/hooks';
import { ITokenInfo } from 'types/assets';

export const useTransfer = () => {
  const { wallet, checkManagerSyncState } = useWallet();
  const { getEwellContract, checkIsNeedApprove } = useViewContract();

  const isStartTimeBeforeNow = useCallback((startTime: string) => dayjs(startTime).isBefore(dayjs()), []);

  const getProjectAddress = useCallback(async () => {
    const ewellContract = await getEwellContract();
    const addressData = await ewellContract.GetPendingProjectAddress.call(wallet?.walletInfo.address);
    console.log('address data', addressData);
    return addressData;
  }, [getEwellContract, wallet?.walletInfo.address]);

  const preCreate = useCallback(
    async (params: { amount: string; symbol: string }) => {
      try {
        const needApprove = await checkIsNeedApprove({
          symbol: params.symbol || '',
          amount: params.amount,
          owner: wallet?.walletInfo.address || '',
          spender: NETWORK_CONFIG.ewellContractAddress,
        });
        console.log('needApprove', needApprove);
        if (!needApprove) return;
      } catch (error: any) {
        console.log('error', error);
        throw new Error(error?.message || 'GetApproveAmount failed');
      }

      console.log('pre-create-txResult-params', params);
      const txResult = await wallet?.callContract({
        contractAddress: NETWORK_CONFIG.sideChainInfo.tokenContractAddress,
        methodName: 'Approve',
        args: {
          spender: NETWORK_CONFIG.ewellContractAddress,
          symbol: params.symbol,
          amount: params.amount,
        },
      });

      console.log('pre-create-txResult', txResult);
      return txResult;
    },
    [checkIsNeedApprove, wallet],
  );

  const create = useCallback(
    async (params: any) => {
      console.log('create-params', params);

      const createResult = await wallet?.callContract<any, any>({
        contractAddress: NETWORK_CONFIG.ewellContractAddress,
        methodName: 'Register',
        args: { ...params },
      });
      console.log('createResult', createResult);
      const projectRegisteredInfo = getLog(createResult.Logs, 'ProjectRegistered');
      console.log('projectRegisteredInfo', projectRegisteredInfo);
      console.log('projectId', projectRegisteredInfo.ProjectRegistered.projectId);
      return {
        projectId: projectRegisteredInfo.ProjectRegistered.projectId,
        transactionId: createResult.TransactionId,
      };
    },
    [wallet],
  );

  const getDetail = useCallback(async (projectId) => {
    const result = await request.project.getProjectList({
      params: {
        chainId: DEFAULT_CHAIN_ID,
        projectId,
      },
    });

    return result?.data?.detail;
  }, []);

  const register = useCallback(
    async ({
      tradingPair,
      idoInfo,
      additional,
      toRaiseToken,
    }: {
      tradingPair: any;
      idoInfo: any;
      additional: any;
      toRaiseToken: ITokenInfo;
    }) => {
      const info = getInfo(tradingPair, idoInfo, additional, toRaiseToken);
      console.log('create-params', info);
      await preCreate({
        amount: info.crowdFundingIssueAmount,
        symbol: info.projectSymbol,
      });
      const { projectId, transactionId } = await create(info);
      const { crowdFundingIssueToken, crowdFundingIssueAmount } = await handleLoopFetch({
        fetch: () => getDetail(projectId),
        times: 30,
        interval: 2000,
        checkIsContinue: (detail) => !detail,
      });

      return {
        projectId,
        transactionId,
        supply: divDecimals(crowdFundingIssueAmount, crowdFundingIssueToken.decimals).toFixed(),
      };
    },
    [create, getDetail, preCreate],
  );

  return {
    isStartTimeBeforeNow,
    register,
    preCreate,
    create,
    getDetail,
    checkManagerSyncState,
    getProjectAddress,
  };
};
