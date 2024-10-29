import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import './styles.less';
import { divDecimalsStr } from 'utils/calculate';
import { NETWORK_CONFIG } from 'constants/network';
import { useMobile } from 'contexts/useStore/hooks';
export interface ITradingParCard {
  chainId: string;
  symbol: string;
  tokenName: string;
  imageUrl: string;
  decimals: number;
  balance: string;
}

interface TradingParCardProps {
  list: ITradingParCard[];
  current?: ITradingParCard;
  onChange?: (value: ITradingParCard) => void;
}

const TokenImg = ({ src, symbol }: { src: string; symbol: string }) => {
  const [imgLoadErr, setImgLoadErr] = useState(false);
  return (
    <>
      {imgLoadErr ? (
        <div className="token-icon token-img-bg">{symbol[0]}</div>
      ) : (
        <img className="token-icon" src={src} onError={() => setImgLoadErr(true)} />
      )}
    </>
  );
};

const TradingPairList: React.FC<TradingParCardProps> = ({ list = [], current, onChange }) => {
  const isMobile = useMobile();

  const onClick = useCallback(
    (item: ITradingParCard) => {
      onChange?.(item);
    },
    [onChange],
  );

  return (
    <div>
      {list.map((item) => (
        <div
          className={clsx({
            'trading-card': true,
            active: current?.symbol === item.symbol && current?.chainId === item.chainId,
          })}
          key={item.symbol}
          onClick={() => onClick(item)}>
          <div className="card-left">
            <TokenImg src={item.imageUrl} symbol={item.symbol} />
            <div>
              <div className="token-name">{item.symbol}</div>
              <div className="chain-info">
                {item.chainId === NETWORK_CONFIG.mainChainId ? 'aelf MainChain' : 'aelf dAppChain'}
              </div>
              {isMobile && <div className="token-quantity">{divDecimalsStr(item.balance, item.decimals)}</div>}
            </div>
          </div>
          {!isMobile && (
            <div className="card-right">
              <div className="token-quantity">{divDecimalsStr(item.balance, item.decimals)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
export default TradingPairList;
