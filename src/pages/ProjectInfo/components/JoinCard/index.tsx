import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { InputNumber, Flex, Form } from 'antd';
import { Typography, FontWeightEnum } from 'aelf-design';
import CommonCard from 'components/CommonCard';
import CommonWrapText, { CommonWrapTextAlignType } from 'components/CommonWrapText';
import NewBaseCountdown from 'components/NewBaseCountdown';
import CommonProjectStatusTag from 'components/CommonProjectStatusTag';
import CommonProjectProgress from 'components/CommonProjectProgress';
import PurchaseButton from '../OperationComponents/PurchaseButton';
import RevokeInvestmentButton from '../OperationComponents/RevokeInvestmentButton';
import ClaimTokenButton from '../OperationComponents/ClaimTokenButton';
import RevokeFineButton from '../OperationComponents/RevokeFineButton';
import { IProjectInfo, ProjectStatus } from 'types/project';
import { DEFAULT_TOKEN_SYMBOL, DEFAULT_TOKEN_DECIMALS, ZERO } from 'constants/misc';
import { divDecimals, divDecimalsStr, timesDecimals } from 'utils/calculate';
import { getHref, getPriceDecimal } from 'utils';
import { parseInputNumberChange } from 'utils/input';
import { useBalance } from 'hooks/useBalance';
import { useTxFee } from 'contexts/useAssets/hooks';
import './styles.less';

const { Title, Text } = Typography;

interface IJoinCardProps {
  projectInfo?: IProjectInfo;
  isPreview?: boolean;
  isLogin: boolean;
  handleRefresh?: () => void;
}

export default function JoinCard({ projectInfo, isPreview, isLogin, handleRefresh }: IJoinCardProps) {
  const { txFee } = useTxFee();
  const { balance } = useBalance(projectInfo?.toRaiseToken?.symbol);

  const [purchaseInputValue, setPurchaseInputValue] = useState('');
  const [purchaseInputErrorMessage, setPurchaseInputErrorMessage] = useState('');
  const [isPurchaseButtonDisabled, setIsPurchaseButtonDisabled] = useState(true);

  const txFeeAmount = useMemo(() => {
    return timesDecimals(txFee, DEFAULT_TOKEN_DECIMALS).times(2);
  }, [txFee]);

  const canPurchaseAmount = useMemo(() => {
    let result = ZERO.plus(balance);
    if (projectInfo?.toRaiseToken?.symbol === DEFAULT_TOKEN_SYMBOL) {
      result = result.minus(txFeeAmount);
    }
    if (result.lt(0)) {
      result = ZERO;
    }
    return result;
  }, [balance, projectInfo?.toRaiseToken?.symbol, txFeeAmount]);

  const maxAllocation = useMemo(() => {
    const remainingTargetRaisedAmount = ZERO.plus(projectInfo?.targetRaisedAmount ?? 0).minus(
      projectInfo?.currentRaisedAmount ?? 0,
    );
    const currentMaxSubscription = ZERO.plus(projectInfo?.maxSubscription ?? 0).minus(projectInfo?.investAmount ?? 0);
    const arr = [remainingTargetRaisedAmount, currentMaxSubscription];
    return BigNumber.min.apply(null, arr);
  }, [
    projectInfo?.currentRaisedAmount,
    projectInfo?.investAmount,
    projectInfo?.maxSubscription,
    projectInfo?.targetRaisedAmount,
  ]);

  const maxCanInvestAmount = useMemo(() => {
    const arr = [maxAllocation, canPurchaseAmount];
    return BigNumber.min.apply(null, arr);
  }, [canPurchaseAmount, maxAllocation]);

  const minCanInvestAmount = useMemo(() => {
    return new BigNumber(projectInfo?.minSubscription ?? 0);
  }, [projectInfo?.minSubscription]);

  const notEnoughTokens = useMemo(() => {
    return canPurchaseAmount.lt(minCanInvestAmount);
  }, [canPurchaseAmount, minCanInvestAmount]);

  const isMaxDisabled = useMemo(() => {
    return isPreview || notEnoughTokens;
  }, [isPreview, notEnoughTokens]);

  const progressPercent = useMemo(() => {
    const percent = ZERO.plus(projectInfo?.currentRaisedAmount ?? 0)
      .div(projectInfo?.targetRaisedAmount ?? 0)
      .times(1e2);
    return percent.isNaN() ? ZERO : percent;
  }, [projectInfo?.currentRaisedAmount, projectInfo?.targetRaisedAmount]);

  const showViewWhitelistTasks = useMemo(() => {
    return projectInfo?.isEnableWhitelist && projectInfo?.whitelistInfo?.url && !projectInfo?.isInWhitelist;
  }, [projectInfo?.isEnableWhitelist, projectInfo?.isInWhitelist, projectInfo?.whitelistInfo?.url]);

  const showWhitelistEnabledLabel = useMemo(() => {
    return (
      projectInfo?.isEnableWhitelist &&
      !projectInfo?.whitelistInfo?.url &&
      !projectInfo?.isInWhitelist &&
      (projectInfo?.status === ProjectStatus.UPCOMING || projectInfo?.status === ProjectStatus.PARTICIPATORY)
    );
  }, [
    projectInfo?.isEnableWhitelist,
    projectInfo?.isInWhitelist,
    projectInfo?.status,
    projectInfo?.whitelistInfo?.url,
  ]);

  const showWhitelistJoined = useMemo(() => {
    return projectInfo?.isEnableWhitelist && projectInfo?.isInWhitelist;
  }, [projectInfo?.isEnableWhitelist, projectInfo?.isInWhitelist]);

  const showMyAmount = useMemo(() => {
    return (
      projectInfo?.status === ProjectStatus.PARTICIPATORY ||
      projectInfo?.status === ProjectStatus.UNLOCKED ||
      projectInfo?.status === ProjectStatus.ENDED
    );
  }, [projectInfo?.status]);

  const canPurchase = useMemo(() => {
    return !projectInfo?.isEnableWhitelist || projectInfo?.isInWhitelist;
  }, [projectInfo?.isEnableWhitelist, projectInfo?.isInWhitelist]);

  const showPurchaseButton = useMemo(() => {
    return canPurchase && projectInfo?.status === ProjectStatus.PARTICIPATORY;
  }, [canPurchase, projectInfo?.status]);

  const showRevokeInvestmentButton = useMemo(() => {
    return projectInfo?.status === ProjectStatus.PARTICIPATORY && new BigNumber(projectInfo?.investAmount ?? 0).gt(0);
  }, [projectInfo?.investAmount, projectInfo?.status]);

  const showUnlockTips = useMemo(() => {
    return projectInfo?.status === ProjectStatus.UNLOCKED && new BigNumber(projectInfo?.investAmount ?? 0).gt(0);
  }, [projectInfo?.investAmount, projectInfo?.status]);

  const showClaimTokenButton = useMemo(() => {
    return (
      projectInfo?.status === ProjectStatus.ENDED &&
      new BigNumber(projectInfo?.investAmount ?? 0).gt(0) &&
      new BigNumber(projectInfo?.toClaimAmount ?? 0).gt(0)
    );
  }, [projectInfo?.investAmount, projectInfo?.status, projectInfo?.toClaimAmount]);

  const showRevokeFineButton = useMemo(() => {
    return (
      projectInfo?.status === ProjectStatus.CANCELED &&
      ZERO.plus(projectInfo?.liquidatedDamageAmount || 0).gt(0) &&
      !projectInfo?.claimedLiquidatedDamage
    );
  }, [projectInfo?.claimedLiquidatedDamage, projectInfo?.liquidatedDamageAmount, projectInfo?.status]);

  const showOperationArea = useMemo(() => {
    return (
      isLogin &&
      (showMyAmount ||
        showPurchaseButton ||
        showRevokeInvestmentButton ||
        showUnlockTips ||
        showClaimTokenButton ||
        showRevokeFineButton)
    );
  }, [
    isLogin,
    showClaimTokenButton,
    showMyAmount,
    showPurchaseButton,
    showRevokeFineButton,
    showRevokeInvestmentButton,
    showUnlockTips,
  ]);

  const hasClaimedToken = useMemo(() => {
    return (
      projectInfo?.status === ProjectStatus.ENDED &&
      new BigNumber(projectInfo?.investAmount ?? 0).gt(0) &&
      new BigNumber(projectInfo?.toClaimAmount ?? 0).eq(0)
    );
  }, [projectInfo?.investAmount, projectInfo?.status, projectInfo?.toClaimAmount]);

  useEffect(() => {
    setIsPurchaseButtonDisabled(() => {
      if (isPreview) {
        return true;
      } else {
        return !!purchaseInputErrorMessage || !purchaseInputValue || new BigNumber(purchaseInputValue).lte(0);
      }
    });
  }, [isPreview, purchaseInputErrorMessage, purchaseInputValue]);

  const handleValidatePurchaseInput = (value?: string) => {
    const bigValue = new BigNumber(value || 0);
    if (!value) {
      setPurchaseInputErrorMessage('');
    } else if (bigValue.gt(divDecimals(canPurchaseAmount, projectInfo?.toRaiseToken?.decimals))) {
      setPurchaseInputErrorMessage(
        `Insufficient balance. Please consider purchasing a smaller amount or transferring some ${
          projectInfo?.toRaiseToken?.symbol || DEFAULT_TOKEN_SYMBOL
        } to your address before you try again.`,
      );
    } else if (bigValue.gt(divDecimals(maxAllocation, projectInfo?.toRaiseToken?.decimals))) {
      setPurchaseInputErrorMessage('Please enter a number not exceeding the maximum allocation.');
    } else if (bigValue.lt(divDecimals(minCanInvestAmount, projectInfo?.toRaiseToken?.decimals))) {
      setPurchaseInputErrorMessage('Please enter a number no smaller than the minimum allocation.');
    } else {
      setPurchaseInputErrorMessage('');
    }
  };

  const renderRemainder = () => {
    if (projectInfo?.status === ProjectStatus.UPCOMING) {
      return (
        <>
          <Text>Starts in</Text>
          <NewBaseCountdown
            className="countdown-wrapper"
            value={projectInfo?.startTime ? dayjs(projectInfo.startTime).valueOf() : 0}
            onFinish={handleRefresh}
          />
        </>
      );
    } else if (projectInfo?.status === ProjectStatus.PARTICIPATORY) {
      return (
        <>
          <Text>Ends in</Text>
          <NewBaseCountdown
            className="countdown-wrapper"
            value={projectInfo?.endTime ? dayjs(projectInfo.endTime).valueOf() : 0}
            onFinish={handleRefresh}
          />
        </>
      );
    } else if (projectInfo?.status === ProjectStatus.UNLOCKED) {
      return (
        <>
          <Text>Token Distribution Time</Text>
          <NewBaseCountdown
            className="countdown-wrapper"
            value={projectInfo?.tokenReleaseTime ? dayjs(projectInfo.tokenReleaseTime).valueOf() : 0}
            onFinish={handleRefresh}
          />
        </>
      );
    } else if (projectInfo?.status === ProjectStatus.CANCELED) {
      return (
        <>
          <Text>Cancelled on</Text>
          <Text fontWeight={FontWeightEnum.Medium}>
            {projectInfo?.cancelTime ? dayjs(projectInfo?.cancelTime).format('DD MMMM, YYYY') : '--'}
          </Text>
        </>
      );
    } else if (projectInfo?.status === ProjectStatus.ENDED) {
      return (
        <>
          <Text>Ended on</Text>
          <Text fontWeight={FontWeightEnum.Medium}>
            {projectInfo?.tokenReleaseTime ? dayjs(projectInfo?.tokenReleaseTime).format('DD MMMM, YYYY') : '--'}
          </Text>
        </>
      );
    } else {
      return '--';
    }
  };

  const renderViewWhitelistTasks = (text: string) => {
    return (
      <Text
        className="purple-text cursor-pointer"
        fontWeight={FontWeightEnum.Medium}
        onClick={() => {
          if (projectInfo?.whitelistInfo?.url) {
            window.open(getHref(projectInfo.whitelistInfo.url), '_blank');
          }
        }}>
        {text}
      </Text>
    );
  };

  return (
    <CommonCard className="join-card-wrapper">
      <Flex vertical gap={8}>
        <Flex align="center" justify="space-between" gap={16}>
          <Title fontWeight={FontWeightEnum.Medium}>Status</Title>
          {!!projectInfo?.status && <CommonProjectStatusTag className="flex-none" status={projectInfo.status} />}
        </Flex>
        <CommonProjectProgress
          textProps={{ className: 'project-progress-text', fontWeight: FontWeightEnum.Medium }}
          progressPercent={progressPercent.toNumber()}
          projectStatus={projectInfo?.status}
          currentRaisedAmount={divDecimalsStr(
            projectInfo?.currentRaisedAmount ?? 0,
            projectInfo?.toRaiseToken?.decimals,
            '0',
          )}
          targetRaisedAmount={divDecimalsStr(projectInfo?.targetRaisedAmount, projectInfo?.toRaiseToken?.decimals)}
          toRaiseTokenSymbol={projectInfo?.toRaiseToken?.symbol}
        />
      </Flex>
      <div className="divider" />
      <Flex vertical gap={12}>
        <Flex gap={16} align="center" justify="space-between">
          {renderRemainder()}
        </Flex>
        <Flex gap={16} align="center" justify="space-between">
          <Text>Sale Price</Text>
          <CommonWrapText
            align={CommonWrapTextAlignType.RIGHT}
            textProps={{ fontWeight: FontWeightEnum.Medium }}
            rowTextList={
              projectInfo?.preSalePrice
                ? [
                    `1 ${projectInfo?.toRaiseToken?.symbol ?? '--'} =`,
                    `${divDecimalsStr(
                      projectInfo?.preSalePrice ?? 0,
                      getPriceDecimal(projectInfo?.crowdFundingIssueToken, projectInfo?.toRaiseToken),
                    )} ${projectInfo?.crowdFundingIssueToken?.symbol ?? '--'}`,
                  ]
                : ['--']
            }
          />
        </Flex>
        <Flex gap={16} align="center" justify="space-between">
          <Text>Min & Max Allocation</Text>
          <CommonWrapText
            align={CommonWrapTextAlignType.RIGHT}
            textProps={{ fontWeight: FontWeightEnum.Medium }}
            rowTextList={[
              `${divDecimalsStr(projectInfo?.minSubscription, projectInfo?.toRaiseToken?.decimals ?? 8)} ${
                projectInfo?.toRaiseToken?.symbol ?? '--'
              } -`,
              `${divDecimalsStr(projectInfo?.maxSubscription, projectInfo?.toRaiseToken?.decimals ?? 8)} ${
                projectInfo?.toRaiseToken?.symbol ?? '--'
              }`,
            ]}
          />
        </Flex>
      </Flex>
      {(showViewWhitelistTasks || showWhitelistJoined || showOperationArea || showWhitelistEnabledLabel) && (
        <div className="divider" />
      )}
      <Flex vertical gap={12}>
        {showViewWhitelistTasks && (
          <>
            {(projectInfo?.status === ProjectStatus.UPCOMING ||
              projectInfo?.status === ProjectStatus.PARTICIPATORY) && (
              <Text>
                Whitelisted is enabled for this sale. To be eligible to participate, users need to complete the
                whitelist tasks beforehand.
              </Text>
            )}
            <Flex justify="flex-end">{renderViewWhitelistTasks('View Whitelist Tasks')}</Flex>
          </>
        )}

        {showWhitelistEnabledLabel && <Text>Whitelisted is enabled for this sale.</Text>}

        {showWhitelistJoined && (
          <Flex gap={16} align="center" justify="space-between">
            <Text>Whitelist</Text>
            {renderViewWhitelistTasks('Joined')}
          </Flex>
        )}
        {showOperationArea && (
          <>
            {showMyAmount && (
              <Flex gap={16} align="center" justify="space-between">
                <Text>My Allocation</Text>
                <Text fontWeight={FontWeightEnum.Medium}>
                  {divDecimalsStr(projectInfo?.investAmount, projectInfo?.toRaiseToken?.decimals ?? 8, '0')}{' '}
                  {projectInfo?.toRaiseToken?.symbol ?? '--'}
                </Text>
              </Flex>
            )}
            {showMyAmount && (
              <Flex gap={16} align="center" justify="space-between">
                <Text>{hasClaimedToken ? 'Receive' : 'To Receive'}</Text>
                <Text fontWeight={FontWeightEnum.Medium}>
                  {divDecimalsStr(
                    hasClaimedToken ? projectInfo?.actualClaimAmount : projectInfo?.toClaimAmount,
                    projectInfo?.crowdFundingIssueToken?.decimals,
                    '0',
                  )}{' '}
                  {projectInfo?.crowdFundingIssueToken?.symbol ?? '--'}
                </Text>
              </Flex>
            )}
            {showPurchaseButton && (
              <>
                <Form.Item
                  className="purchase-input-number-wrapper"
                  validateStatus={purchaseInputErrorMessage && 'error'}
                  help={purchaseInputErrorMessage}>
                  <InputNumber
                    className="purchase-input-number"
                    placeholder="Enter amount"
                    controls={false}
                    stringMode
                    wheel={false}
                    addonAfter={
                      <div className="max-operation-wrapper">
                        <Title
                          className="max-operation purple-text cursor-pointer"
                          fontWeight={FontWeightEnum.Medium}
                          onClick={() => {
                            if (isMaxDisabled) {
                              return;
                            }
                            const maxValue = divDecimals(
                              maxCanInvestAmount,
                              projectInfo?.toRaiseToken?.decimals,
                            ).toFixed();
                            setPurchaseInputValue(maxValue);
                            handleValidatePurchaseInput(maxValue);
                          }}
                          disabled={isMaxDisabled}>
                          MAX
                        </Title>
                      </div>
                    }
                    disabled={isPreview}
                    min="0"
                    value={purchaseInputValue}
                    onChange={(value) => {
                      const newValue = parseInputNumberChange(value || '', projectInfo?.toRaiseToken?.decimals);
                      setPurchaseInputValue(newValue);
                      handleValidatePurchaseInput(newValue);
                    }}
                  />
                </Form.Item>
                <PurchaseButton
                  buttonDisabled={isPurchaseButtonDisabled}
                  projectInfo={projectInfo}
                  purchaseAmount={purchaseInputValue}
                  handleClearInput={() => setPurchaseInputValue('')}
                />
              </>
            )}
            {showRevokeInvestmentButton && <RevokeInvestmentButton projectInfo={projectInfo} />}
            {showUnlockTips && (
              <Text className="text-center" fontWeight={FontWeightEnum.Medium}>
                Be prepared to claim tokens when they're unlocked.
              </Text>
            )}
            {showClaimTokenButton && <ClaimTokenButton projectInfo={projectInfo} />}
            {showRevokeFineButton && <RevokeFineButton projectInfo={projectInfo} />}
          </>
        )}
      </Flex>
    </CommonCard>
  );
}
