import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TradingPairList, { ITradingParCard } from '../components/TradingPairList';
import './styles.less';
import { CreateStepProps } from '../types';
import { useLocalStorage } from 'react-use';
import storages from '../storages';
import { request } from 'api';
import { DEFAULT_CHAIN_ID, NETWORK_CONFIG } from 'constants/network';
import ButtonGroup from '../components/ButtonGroup';
import { useWallet } from 'contexts/useWallet/hooks';
import { WebLoginState } from 'aelf-web-login';
import myEvents from 'utils/myEvent';
import { emitLoading } from 'utils/events';
import { checkIsAuthorized } from 'api/utils';
import { Flex, Select } from 'antd';
import { arrow } from 'assets/images';
import { TokenType } from 'constants/misc';
import { currencyOptions } from '../constants';
import { infoCircle } from 'assets/images/icon';
import { FontWeightEnum, Typography } from 'aelf-design';
import { walletCard } from 'assets/images/icon';
import { useMobile } from 'contexts/useStore/hooks';
import clsx from 'clsx';

const { Title, Text } = Typography;

const TokenNote: React.FC = React.memo(() => {
  return (
    <Flex gap={4}>
      <img src={infoCircle} style={{ width: 12, height: 12, marginTop: 3 }} />
      <Text size="small">
        You can only select tokens for which you are the issuer. You can create a token using SEED which is acquirable
        through{' '}
        <span className="link-text" onClick={() => window.open(NETWORK_CONFIG.symbolMarketUrl)}>
          Symbol Market
        </span>
        .
      </Text>
    </Flex>
  );
});

const TokenEmpty: React.FC = React.memo(() => {
  const isMobile = useMobile();
  const height = useMemo(() => {
    return isMobile ? 'calc(100vh - 64px - 120px - 386px)' : 'calc(100vh - 64px - 72px - 386px)';
  }, [isMobile]);

  return (
    <Flex vertical gap={24}>
      <Flex vertical justify="center" align="center" gap={16} style={{ height, maxHeight: 310, minHeight: 118 }}>
        <img src={walletCard} style={{ width: 80, height: 80 }} alt="logo" />
        <Text>No token found in your wallet.</Text>
      </Flex>
      <TokenNote />
    </Flex>
  );
});

const ConfirmTradingPair: React.FC<CreateStepProps> = ({ onNext }) => {
  const [tradingPair, setTradingPair] = useLocalStorage<ITradingParCard>(storages.ConfirmTradingPair);
  const [currency, setCurrency] = useLocalStorage<TokenType>(storages.Currency, TokenType.ELF);
  const [select, setSelect] = useState<ITradingParCard | undefined>(tradingPair);
  const selectRef = useRef<ITradingParCard>();
  selectRef.current = select;

  const [tokenList, setTokenList] = useState<ITradingParCard[]>([]);
  const [disabledBtn, setDisabledBtn] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const { loginState } = useWallet();
  const isBtnDisabled = useMemo(
    () => loginState !== WebLoginState.logined || (disabledBtn && !select) || !tokenList.length,
    [disabledBtn, loginState, select, tokenList.length],
  );

  const onSelect = useCallback((value: ITradingParCard) => {
    setDisabledBtn(false);
    setSelect({ ...value });
  }, []);

  const onClick = useCallback(() => {
    setTradingPair(select);
    console.log('click-next', select);
    onNext?.();
  }, [setTradingPair, select, onNext]);

  const getTokenList = useCallback(async () => {
    emitLoading(true);
    try {
      const {
        code,
        data,
        message: msg,
      } = await request.project.getTokenList({
        params: { chainId: DEFAULT_CHAIN_ID },
      });
      if (code === '20000') {
        setTokenList(data);
        const selectToken = selectRef.current;
        if (selectToken) {
          const selectTokenIndex = data.findIndex(
            (item) => item.symbol === selectToken.symbol && item.chainId === selectToken.chainId,
          );
          selectTokenIndex < 0 ? setSelect(undefined) : setSelect(data[selectTokenIndex]);
        }

        return;
      }
      console.log('getTokenList-error:', msg);
    } catch (error: any) {
      console.log('error', error);
    } finally {
      emitLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isAuthorized = checkIsAuthorized();
    isAuthorized ? getTokenList() : setLoading(false);

    const { remove } = myEvents.AuthToken.addListener(getTokenList);
    return () => {
      remove();
    };
  }, [getTokenList]);

  const onSelectCurrency = useCallback(
    (val) => {
      console.log('onSelect');
      setCurrency(val);
    },
    [setCurrency],
  );
  const onDropdownVisibleChange = useCallback((open) => setShowDropdown(open), []);

  return (
    <>
      {!loading && (
        <Flex className="trading-page" vertical gap={48} flex={1}>
          {tokenList.length ? (
            <Flex vertical gap={24}>
              <Title level={6} style={{ marginBottom: 0 }} fontWeight={FontWeightEnum.Medium}>
                Raise funds for your project in ewell
              </Title>
              <Flex vertical gap={8}>
                <Text>1. Select the token you want to sell.</Text>
                <TradingPairList list={tokenList} current={select} onChange={onSelect} />
                <TokenNote />
              </Flex>
              <Flex vertical gap={8}>
                <Text>2. Choose a currency that can be used to purchase your tokens.</Text>
                <Select
                  suffixIcon={
                    <img src={arrow} className={clsx(showDropdown ? 'select-arrow-up' : 'select-arrow-down')} />
                  }
                  defaultValue={currency}
                  options={currencyOptions}
                  style={{ width: '100%' }}
                  onSelect={onSelectCurrency}
                  onDropdownVisibleChange={onDropdownVisibleChange}
                />
              </Flex>
            </Flex>
          ) : (
            <TokenEmpty />
          )}
          <ButtonGroup onNext={onClick} disabledNext={isBtnDisabled} />
        </Flex>
      )}
    </>
  );
};
export default ConfirmTradingPair;
