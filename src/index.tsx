import App from './App';
import { prefixCls } from 'constants/theme';
import WalletProvider from './contexts/useWallet';
import './assets/theme/antd.css';
import 'aelf-web-login/dist/assets/index.css';
import '@portkey/did-ui-react/dist/assets/index.css';
import './index.css';
import { ReactNode } from 'react';
import StoreProvider from './contexts/useStore';
import ViewContractProvider from 'contexts/useViewContract';
import { ConfigProvider } from 'antd';
import { AELFDProvider } from 'aelf-design';
import { AELFD_CUSTOM_TOKEN_CONFIG, AELFD_THEME_CONFIG, ANTD_THEME_CONFIG } from 'themTokenConfig';
import { BrowserRouter } from 'react-router-dom';
import 'aelf-design/css';
import AssetsProvider from 'contexts/useAssets';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { IS_MAINNET_PRODUCTION, SENTRY_DSN } from 'constants/network';

IS_MAINNET_PRODUCTION &&
  SENTRY_DSN &&
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    environment: 'production',
  });

ConfigProvider.config({
  prefixCls,
});

function ContextProviders({ children }: { children?: ReactNode }) {
  return (
    <BrowserRouter>
      <AELFDProvider customToken={AELFD_CUSTOM_TOKEN_CONFIG} prefixCls={prefixCls} theme={AELFD_THEME_CONFIG}>
        <ConfigProvider prefixCls={prefixCls} theme={ANTD_THEME_CONFIG}>
          <StoreProvider>
            <ViewContractProvider>
              <AssetsProvider>
                <WalletProvider>{children}</WalletProvider>
              </AssetsProvider>
            </ViewContractProvider>
          </StoreProvider>
        </ConfigProvider>
      </AELFDProvider>
    </BrowserRouter>
  );
}

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <ContextProviders>
    <App />
  </ContextProviders>,
);
