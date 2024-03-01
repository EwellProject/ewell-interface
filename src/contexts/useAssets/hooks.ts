import { useCallback, useMemo } from 'react';
import { SET_TOKEN_PRICE, SET_TX_FEE, useAssetsContext } from '.';
import { getTokenPriceApi, getTxFeeApi } from './utils';
import { handleLoopFetch } from 'utils';
import { DEFAULT_TX_FEE, PRICE_QUOTE_COIN } from 'constants/assets';
import { DEFAULT_TOKEN_SYMBOL, TOKEN_LIST } from 'constants/misc';

export function useAssets() {
  const [{ txFee, tokenPrice }, dispatch] = useAssetsContext();

  const getTokenPrice = useCallback(
    async (symbol = DEFAULT_TOKEN_SYMBOL) => {
      const { price } = await getTokenPriceApi(symbol, PRICE_QUOTE_COIN);
      dispatch({
        type: SET_TOKEN_PRICE,
        payload: {
          tokenPrice: {
            [`${symbol}_${PRICE_QUOTE_COIN}`]: price,
          },
        },
      });
      return price;
    },
    [dispatch],
  );

  const getTxFee = useCallback(async () => {
    const { transactionFee } = await getTxFeeApi();
    dispatch({
      type: SET_TX_FEE,
      payload: {
        txFee: {
          common: transactionFee,
        },
      },
    });
    return transactionFee;
  }, [dispatch]);

  const initTxFee = useCallback(async () => {
    try {
      await handleLoopFetch({
        fetch: () => {
          return getTxFee();
        },
        times: 5,
        interval: 1000,
        checkIsContinue: (result) => !result,
      });
    } catch (error) {
      console.log('Init txFee', error);
    }
  }, [getTxFee]);

  const initTokenPrice = useCallback(
    async (symbol = DEFAULT_TOKEN_SYMBOL) => {
      try {
        await handleLoopFetch({
          fetch: () => {
            return getTokenPrice(symbol);
          },
          times: 5,
          interval: 1000,
          checkIsContinue: (result) => !result,
        });
      } catch (error) {
        console.log('Init tokenPrice', error);
      }
    },
    [getTokenPrice],
  );

  const init = useCallback(() => {
    initTxFee();
    TOKEN_LIST.forEach((item) => initTokenPrice(item.symbol));
  }, [initTokenPrice, initTxFee]);

  return {
    txFee,
    tokenPrice,
    getTokenPrice,
    getTxFee,
    init,
    initTxFee,
    initTokenPrice,
  };
}

export function useTokenPrice(symbol = DEFAULT_TOKEN_SYMBOL) {
  const { tokenPrice, getTokenPrice } = useAssets();

  const _tokenPrice = useMemo(() => tokenPrice?.[`${symbol}_USD`], [symbol, tokenPrice]);

  return {
    tokenPrice: _tokenPrice,
    getTokenPrice,
  };
}

export function useGetTokenPrice() {
  const { tokenPrice } = useAssets();

  return useCallback(
    (symbol = DEFAULT_TOKEN_SYMBOL) => {
      return tokenPrice?.[`${symbol}_USD`];
    },
    [tokenPrice],
  );
}

export function useTxFee() {
  const { txFee, getTxFee } = useAssets();

  const _txFee = useMemo(() => (txFee || DEFAULT_TX_FEE).common, [txFee]);

  return {
    txFee: _txFee,
    getTxFee,
  };
}
